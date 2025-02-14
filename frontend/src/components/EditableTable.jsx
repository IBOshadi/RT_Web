import { FaTrash } from "react-icons/fa";

const ScrollableTable = ({ headers, data, editableColumns, onRowChange, onDeleteRow }) => {
  const shouldScroll = data.length > 7; // Check if more than 7 rows

  // Function to get the input type for a specific column
  const getInputType = (columnIndex) => {
    const editableColumn = editableColumns.find(
      (col) => col.index === columnIndex
    );
    return editableColumn ? editableColumn.type : "text"; // Default to 'text' if not defined
  };

  // Function to get the alignment class for a specific column
  const getColumnAlignment = (columnIndex) => {
    // Align columns 5, 6, 7, and 8 to the right, others to the center
    return [5, 6, 7, 8].includes(columnIndex) ? "text-right" : "text-center";
  };

  return (
    <div className="p-4 flex flex-col">

  <div className="my-5 mx-auto rounded-lg border border-gray-400">
    {/* Wrapper for horizontal scrolling */}
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
      <thead className="bg-gray-100 sticky top-0">
  <tr>
    {headers.map((header, index) => (
      <th
        key={index}
        className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300"
      >
        {header}
      </th>
    ))}
    {data.length > 0 && ( // Only render "Actions" heading if data is not empty
      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
        Actions
      </th>
    )}
  </tr>
</thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-100">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-6 py-3 whitespace-nowrap text-sm ${getColumnAlignment(cellIndex)} text-gray-900 border border-gray-300`}
                >
                  {editableColumns.some((col) => col.index === cellIndex) ? (
                    <input
                      type={getInputType(cellIndex)}
                      value={cell || ""}
                      onChange={(e) =>
                        onRowChange(rowIndex, cellIndex, e.target.value)
                      }
                      className="w-full"
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
              {/* Delete button with icon */}
              <td className="px-6 py-3 text-center">
                <button
                  onClick={() => onDeleteRow(rowIndex)} // Call delete function on click
                  className="text-red-600 hover:text-red-800 p-2"
                >
                  <FaTrash size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>


  );
};

export default ScrollableTable;
