# Discord Channel Analyzer

This script analyzes Discord channel messages and generates Excel-compatible CSV reports for worker activity tracking.

## Usage

```bash
npm run analyze-channel
```

## What it does

1. **Reads all messages** from Discord channel `1412325130926948362`
2. **Parses activities** using the existing FarmMessageParser
3. **Tracks per worker**:
   - Plants deposited/taken out
   - Boxes deposited/taken out
   - Money deposited/taken out
   - Miscellaneous items taken out
4. **Generates 3 CSV files**:
   - `detailed-transactions-[timestamp].csv` - Every transaction with full details
   - `worker-summary-[timestamp].csv` - Summary statistics per worker
   - `activity-breakdown-[timestamp].csv` - Organized by activity type

## Output Location

CSV files are saved to: `exports/` directory

## Excel Import

1. Open Microsoft Excel
2. Go to **Data > Get Data > From Text/CSV**
3. Select the generated CSV file
4. Choose **UTF-8** encoding
5. The data will be properly formatted in columns

## Generated Reports

### Detailed Transactions
- Worker Name, Transaction Type, Category, Item Name, Quantity, Amount, Timestamp, Message Content, Confidence

### Worker Summary
- Worker Name, Total Transactions, Plants Types, Boxes Types, Money Transactions, Misc Items

### Activity Breakdown
- Worker Name, Activity Type, Item Name, Total Quantity, Total Amount

Perfect for analyzing:
- Worker productivity
- Resource flow tracking
- Financial transactions
- Ferrovia mission analysis