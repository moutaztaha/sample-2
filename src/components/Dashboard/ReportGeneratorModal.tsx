import React, { useState } from 'react';
import { X, FileText, Download, Check } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColumnOption {
  id: string;
  label: string;
  checked: boolean;
  width: number; // Column width in pixels or percentage
}

const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({ isOpen, onClose }) => {
  const [columns, setColumns] = useState<ColumnOption[]>([
    { id: 'name', label: 'Item Name', checked: true, width: 150 },
    { id: 'sku', label: 'SKU', checked: true, width: 100 },
    { id: 'description', label: 'Description', checked: false, width: 200 },
    { id: 'category_name', label: 'Category', checked: true, width: 120 },
    { id: 'subcategory_name', label: 'Subcategory', checked: false, width: 120 },
    { id: 'unit_name', label: 'Unit', checked: true, width: 80 },
    { id: 'location_name', label: 'Location', checked: true, width: 120 },
    { id: 'supplier_name', label: 'Supplier', checked: false, width: 150 },
    { id: 'quantity', label: 'Quantity', checked: true, width: 80 },
    { id: 'min_quantity', label: 'Min Quantity', checked: false, width: 100 },
    { id: 'max_quantity', label: 'Max Quantity', checked: false, width: 100 },
    { id: 'unit_price', label: 'Unit Price', checked: true, width: 100 },
    { id: 'total_value', label: 'Total Value', checked: true, width: 120 }
  ]);

  const [reportType, setReportType] = useState<'pdf' | 'csv'>('pdf');
  const [reportTitle, setReportTitle] = useState('Inventory Report');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleColumnToggle = (id: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, checked: !col.checked } : col
      )
    );
  };

  const handleColumnWidthChange = (id: string, width: number) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, width } : col
      )
    );
  };

  const handleSelectAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, checked: true })));
  };

  const handleSelectNone = () => {
    setColumns(prev => prev.map(col => ({ ...col, checked: false })));
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get selected column IDs and their widths
      const selectedColumns = columns.filter(col => col.checked).map(col => ({
        id: col.id,
        width: col.width
      }));
      
      if (selectedColumns.length === 0) {
        setError('Please select at least one column for the report');
        setLoading(false);
        return;
      }

      // Generate the report based on type
      let blob;
      if (reportType === 'pdf') {
        blob = await inventoryService.exportPDF(
          selectedColumns.map(col => col.id), 
          reportTitle,
          selectedColumns.map(col => ({ id: col.id, width: col.width })),
          orientation
        );
      } else {
        blob = await inventoryService.exportCSV(
          selectedColumns.map(col => col.id),
          selectedColumns.map(col => ({ id: col.id, width: col.width }))
        );
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '_')}.${reportType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Generate Custom Report</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Report Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Title
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter report title"
            />
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Format
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={reportType === 'pdf'}
                  onChange={() => setReportType('pdf')}
                />
                <span className="ml-2">PDF Document</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={reportType === 'csv'}
                  onChange={() => setReportType('csv')}
                />
                <span className="ml-2">CSV Spreadsheet</span>
              </label>
            </div>
          </div>

          {/* Orientation (only for PDF) */}
          {reportType === 'pdf' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Orientation
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={orientation === 'portrait'}
                    onChange={() => setOrientation('portrait')}
                  />
                  <span className="ml-2">Portrait</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    checked={orientation === 'landscape'}
                    onChange={() => setOrientation('landscape')}
                  />
                  <span className="ml-2">Landscape</span>
                </label>
              </div>
            </div>
          )}

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Columns to Include
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select None
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
              <div className="space-y-3">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                        checked={column.checked}
                        onChange={() => handleColumnToggle(column.id)}
                      />
                      <span className="ml-2 text-gray-700">{column.label}</span>
                    </label>
                    
                    {column.checked && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Width:</span>
                        <input
                          type="number"
                          min="50"
                          max="300"
                          value={column.width}
                          onChange={(e) => handleColumnWidthChange(column.id, parseInt(e.target.value) || 100)}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-xs text-gray-500 ml-1">px</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Report Preview</h3>
            <p className="text-sm text-blue-700">
              Your report will include {columns.filter(c => c.checked).length} columns:
              {' '}{columns.filter(c => c.checked).map(c => c.label).join(', ')}
            </p>
            <div className="mt-2 pt-2 border-t border-blue-100">
              <p className="text-xs text-blue-600">
                Column widths will be applied to the generated report.
                {reportType === 'pdf' && ` Page orientation: ${orientation}.`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGeneratorModal;