const ScrollableTable = ({ headers, data, onRowClick }) => {
  const shouldScroll = data.length > 7; // Check if more than 7 rows

  return (
    <div className="overflow-x-auto my-5 mx-auto rounded-lg border border-gray-400">
      <div
        className={`overflow-y-auto ${shouldScroll ? 'max-h-64' : ''}`}
        style={shouldScroll ? { maxHeight: '350px' } : {}} // Adjust maxHeight for 7 rows
      >
        <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-100 cursor-pointer"
                onClick={() =>
                  onRowClick(headers, row) // Pass headers and row data separately
                }
              >
                {headers.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-6 py-3 whitespace-nowrap text-sm ${
                      cellIndex > 0 ? 'text-right' : 'text-center'
                    } text-gray-900 border border-gray-300`}
                  >
                    {row[cellIndex] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScrollableTable;
