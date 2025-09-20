 const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Накладная № ${invoiceNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: white;
            color: #000;
            line-height: 1.4;
        }
        
        .page-container {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: white;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }
        
        @media print {
            .page-container {
                box-shadow: none;
                margin: 0;
            }
            
            @page {
                size: A4 portrait;
                margin: 0;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        .invoice-container {
            width: 210mm;
            height: 148.5mm;
            position: relative;
            border-bottom: 2px dashed #888888;
            padding: 3mm;
            box-sizing: border-box;
            flex: 1;
        }
        
        .invoice-container:last-child {
            border-bottom: none;
        }
        
        .header-section {
            padding: 15px 12px 12px 20px;
            position: relative;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .logo {
            width: 84px;
            height: 22px;
        }
        
        .date-section {
            width: 70px;
            margin-right: 40px;
            text-align: right;
        }
        
        .date-label {
            font-size: 11px;
            font-weight: 500;
            color: #949494;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .date-value {
            font-size: 12.1px;
            font-weight: 600;
            color: #28352f;
            letter-spacing: -0.1px;
            white-space: nowrap;
        }
        
        .invoice-title {
            text-align: center;
            margin-top: 15px;
            margin-bottom: 12px;
            font-size: 15.4px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.12px;
        }
        
        .invoice-number {
            font-weight: 600;
            margin-left: 6px;
        }
        
        .sender-recipient-section {
            background-color: #eeeeee;
            padding: 8px 15px 10px 15px;
            margin: 0;
        }
        
        .sender-recipient-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
        }
        
        .info-block {
            width: 45%;
        }
        
        .info-label {
            font-size: 11px;
            font-weight: 500;
            color: #5c5c5c;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .info-value {
            font-size: 12.1px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.1px;
        }
        
        .restaurant-name {
            font-size: 11px;
            font-weight: 500;
            color: #000;
            letter-spacing: -0.09px;
            margin-top: 1px;
        }
        
        .table-section {
            padding: 0 12px;
            margin-top: 12px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #888888;
        }
        
        .table-header {
            background-color: #f8f8f8;
            height: 32px;
            border-bottom: 1px solid black;
        }
        
        .table-header th {
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 11px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.08px;
            border-right: 1px solid #888888;
        }
        
        .table-header th:last-child {
            border-right: none;
        }
        
        .table-header .sub-label {
            font-size: 9.9px;
            color: #666666;
            letter-spacing: -0.07px;
            margin-top: 1px;
            display: block;
            font-weight: 500;
        }
        
        .col-number {
            width: 25px;
            text-align: center;
        }
        
        .col-name {
            width: 45%;
        }
        
        .col-unit {
            width: 35px;
        }
        
        .col-quantity {
            width: 40px;
            text-align: center;
        }
        
        .col-price {
            width: 50px;
            text-align: center;
        }
        
        .col-total {
            width: 60px;
            text-align: right;
        }
        
        .table-row {
            height: 30px;
            border-bottom: 0.5px solid #d2d2d2;
        }
        
        .table-row td {
            padding: 4px 6px;
            vertical-align: center;
            font-size: 11px;
            font-weight: 500;
            color: #212121;
            letter-spacing: -0.08px;
            border-right: 1px solid #d2d2d2;
        }
        
        .table-row td:last-child {
            border-right: none;
        }
        
        .product-name {
            font-weight: 700;
            color: black;
            margin-bottom: 1px;
            font-size: 11px;
        }
        
        .product-description {
            color: #2d2d2d;
            font-weight: 500;
            font-size: 9.9px;
        }
        
        .total-section {
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
            padding-right: 12px;
        }
        
        .total-box {
            background-color: #f8f8f8;
            border: 1px solid #888888;
            border-radius: 3px;
            padding: 5px 8px 6px 8px;
            width: 125px;
        }
        
        .total-label {
            font-size: 11px;
            font-weight: 500;
            color: #484848;
            margin-bottom: 1px;
            letter-spacing: -0.08px;
        }
        
        .total-amount {
            font-size: 13.2px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.1px;
        }
        
        .signatures-section {
            margin-top: 15px;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-block {
            width: 45%;
        }
        
        .signature-label {
            font-size: 11px;
            font-weight: 500;
            color: #282828;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .signature-line {
            font-size: 12.1px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.1px;
        }
        
        .credits {
            position: absolute;
            bottom: 38px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8.8px;
            font-weight: 500;
            color: #8d8d8d;
            letter-spacing: -0.08px;
        }
        
        .footer {
            position: absolute;
            bottom: 7px;
            left: 0;
            right: 0;
            height: 31px;
            background-color: #d6eae6;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 25px;
        }
        
        .footer-logo {
            width: 18px;
            height: 18px;
            border-radius: 50%;
        }
        
        .footer-text {
            font-size: 12.1px;
            font-weight: 500;
            color: #303030;
            letter-spacing: -0.08px;
        }
        
        .footer-left {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .print-section {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f5f5f5;
        }

        .print-button {
            background-color: #148274;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 19.4px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .print-button:hover {
            background-color: #0c6b5e;
        }

        @media print {
            .print-section {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="print-section">
        <button class="print-button" onclick="window.print()">
            🖨️ Печать накладной
        </button>
    </div>

    <div class="page-container">
        <div class="invoice-container">
            <div class="header-section">
                <img src="https://whiteray.uz/images/whiteray_1200px_logo_green.png" alt="WhiteRay Logo" class="logo">
                
                <div class="date-section">
                    <div class="date-label">Дата</div>
                    <div class="date-value">${currentDate}</div>
                </div>
            </div>
            
            <div class="invoice-title">
                <span style="font-weight: 700;">YUK XATI /</span>
                <span style="font-weight: 700;">НАКЛАДНАЯ</span>
                <span class="invoice-number">№ ${invoiceNumber}</span>
            </div>
            
            <div class="sender-recipient-section">
                <div class="sender-recipient-content">
                    <div class="info-block">
                        <div class="info-label">Kimdan / От кого</div>
                        <div class="info-value">${senderName}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Kimga / Кому</div>
                        <div class="info-value">${client.displayOrgName}</div>
                        ${
                          client.displayOrgName !== (customRestaurantName || client.displayRestaurantName)
                            ? `<div class="restaurant-name">( ${customRestaurantName || client.displayRestaurantName} )</div>`
                            : ''
                        }
                    </div>
                </div>
            </div>
            
            <div class="table-section">
                <table class="products-table">
                    <thead>
                        <tr class="table-header">
                            <th class="col-number">#</th>
                            <th class="col-name">
                                Nomi
                                <span class="sub-label">Наименование</span>
                            </th>
                            <th class="col-unit">
                                O'lchov bir.
                                <span class="sub-label">Ед.изм</span>
                            </th>
                            <th class="col-quantity">
                                Soni
                                <span class="sub-label">Кол-во</span>
                            </th>
                            <th class="col-price">
                                Narxi
                                <span class="sub-label">Цена</span>
                            </th>
                            <th class="col-total">
                                Summasi
                                <span class="sub-label">Сумма</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productRowsHtml}
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-box">
                        <div class="total-label">Итого</div>
                        <div class="total-amount">${totalAmount.toLocaleString('ru-RU')} сум</div>
                    </div>
                </div>
            </div>
            
            <div class="signatures-section">
                <div class="signature-block">
                    <div class="signature-label">Berdim / Отпустил</div>
                    <div class="signature-line">__________________</div>
                </div>
                <div class="signature-block">
                    <div class="signature-label">Oldim / Получил</div>
                    <div class="signature-line">__________________</div>
                </div>
            </div>
            
            <div class="credits">By D&A</div>
            
            <div class="footer">
                <div class="footer-left">
                    <img src="https://whiteray.uz/images/favicon.png" alt="Logo" class="footer-logo">
                    <div class="footer-text">www.whiteray.uz</div>
                </div>
                <div class="footer-text">+998 97 716 61 33</div>
            </div>
        </div>

        <div class="invoice-container">
            <div class="header-section">
                <img src="https://whiteray.uz/images/whiteray_1200px_logo_green.png" alt="WhiteRay Logo" class="logo">
                
                <div class="date-section">
                    <div class="date-label">Дата</div>
                    <div class="date-value">${currentDate}</div>
                </div>
            </div>
            
            <div class="invoice-title">
                <span style="font-weight: 700;">YUK XATI /</span>
                <span style="font-weight: 700;">НАКЛАДНАЯ</span>
                <span class="invoice-number">№ ${invoiceNumber}</span>
            </div>
            
            <div class="sender-recipient-section">
                <div class="sender-recipient-content">
                    <div class="info-block">
                        <div class="info-label">Kimdan / От кого</div>
                        <div class="info-value">${senderName}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Kimga / Кому</div>
                        <div class="info-value">${client.displayOrgName}</div>
                        ${
                          client.displayOrgName !== (customRestaurantName || client.displayRestaurantName)
                            ? `<div class="restaurant-name">( ${customRestaurantName || client.displayRestaurantName} )</div>`
                            : ''
                        }
                    </div>
                </div>
            </div>
            
            <div class="table-section">
                <table class="products-table">
                    <thead>
                        <tr class="table-header">
                            <th class="col-number">#</th>
                            <th class="col-name">
                                Nomi
                                <span class="sub-label">Наименование</span>
                            </th>
                            <th class="col-unit">
                                O'lchov bir.
                                <span class="sub-label">Ед.изм</span>
                            </th>
                            <th class="col-quantity">
                                Soni
                                <span class="sub-label">Кол-во</span>
                            </th>
                            <th class="col-price">
                                Narxi
                                <span class="sub-label">Цена</span>
                            </th>
                            <th class="col-total">
                                Summasi
                                <span class="sub-label">Сумма</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productRowsHtml}
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-box">
                        <div class="total-label">Итого</div>
                        <div class="total-amount">${totalAmount.toLocaleString('ru-RU')} сум</div>
                    </div>
                </div>
            </div>
            
            <div class="signatures-section">
                <div class="signature-block">
                    <div class="signature-label">Berdim / Отпустил</div>
                    <div class="signature-line">__________________</div>
                </div>
                <div class="signature-block">
                    <div class="signature-label">Oldim / Получил</div>
                    <div class="signature-line">__________________</div>
                </div>
            </div>
            
            <div class="credits">By D&A</div>
            
            <div class="footer">
                <div class="footer-left">
                    <img src="https://whiteray.uz/images/favicon.png" alt="Logo" class="footer-logo">
                    <div class="footer-text">www.whiteray.uz</div>
                </div>
                <div class="footer-text">+998 97 716 61 33</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    return htmlTemplate;
};