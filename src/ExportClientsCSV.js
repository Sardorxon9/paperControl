import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase'; // Assuming your firebase file is in src/firebase.js

// Define all the headers for the CSV file, including client and roll data
const CSV_HEADERS = [
  'clientId',
  'restaurant',
  'designType',
  'totalKg',
  'notifyWhen',
  'shellNum',
  'packaging',
  'orgName',
  'productType',
  'addressShort',
  'comment',
  'rollId',
  'rollStatus',
  'rollPaperRemaining',
  'rollTotalKg',
  'rollAddedDate'
];

const ExportClientsToCSV = () => {
  const [loading, setLoading] = useState(false);
  const [db, setDb] = useState(null);

  // Function to convert an array of objects to a CSV string
  const convertToCSV = (data) => {
    // Escape values that contain commas or double quotes
    const escapeCSVValue = (value) => {
      if (value === null || value === undefined) {
        return '';
      }
      let stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headerLine = CSV_HEADERS.map(escapeCSVValue).join(',');
    const dataLines = data.map(row =>
      CSV_HEADERS.map(header => escapeCSVValue(row[header])).join(',')
    );

    return [headerLine, ...dataLines].join('\n');
  };

  const handleExport = async () => {
    if (!db || !auth) {
      console.error('Firebase services not initialized.');
      return;
    }
    setLoading(true);
    try {
      // Get a reference to the clients collection
      const clientsCollectionRef = collection(db, 'clients');
      const clientsSnapshot = await getDocs(clientsCollectionRef);

      // Prepare an array to hold all client and roll data
      const allData = [];

      for (const clientDoc of clientsSnapshot.docs) {
        const clientData = clientDoc.data();
        
        // Fetch the subcollection for each client
        const rollsCollectionRef = collection(clientDoc.ref, 'rolls');
        const rollsSnapshot = await getDocs(rollsCollectionRef);

        // If there are rolls, create a row for each one
        if (!rollsSnapshot.empty) {
          rollsSnapshot.docs.forEach(rollDoc => {
            const rollData = rollDoc.data();
            allData.push({
              clientId: clientDoc.id,
              ...clientData,
              rollId: rollDoc.id,
              rollStatus: rollData.status || '',
              rollPaperRemaining: rollData.paperRemaining,
              rollTotalKg: rollData.totalKg,
              rollAddedDate: rollData.addedDate ? rollData.addedDate.toDate().toISOString() : ''
            });
          });
        } else {
          // If a client has no rolls, still include a row for them
          allData.push({
            clientId: clientDoc.id,
            ...clientData,
            rollId: '',
            rollStatus: '',
            rollPaperRemaining: null,
            rollTotalKg: null,
            rollAddedDate: ''
          });
        }
      }

      // Generate the CSV file content
      const csvContent = convertToCSV(allData);

      // Create a Blob and a temporary URL to download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Set the link attributes and trigger the download
      link.setAttribute('href', url);
      link.setAttribute('download', 'clients_and_rolls_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Export successful!');
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex justify-end">
      <button 
        onClick={handleExport} 
        disabled={loading}
        className="px-6 py-3 bg-teal-600 text-white font-bold rounded-lg shadow-md hover:bg-teal-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Exporting...' : 'Export to CSV'}
      </button>
    </div>
  );
};

export default ExportClientsToCSV;
