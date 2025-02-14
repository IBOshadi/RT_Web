import React, { useEffect, useRef } from 'react';
import { Chart, ArcElement, Tooltip, Legend, PieController, Title } from 'chart.js';

// Register necessary elements and controller
Chart.register(ArcElement, Tooltip, Legend, PieController, Title);

const PieChart = ({ data, labels, colors, title, position,align }) => {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null); // Ref to store the chart instance

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');

    // Destroy the previous chart instance if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Create a new chart instance
    chartInstanceRef.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: position, // Position legend to the right
            align: align,
            labels: {
              boxWidth: 20, // Size of the box next to the label
              padding: 10,   // Space between the box and the label text
            },
          },
          title: {
            display: true, // Show the title
            text: title, // Use the title prop passed to the component
            font: {
              size: 18, // Font size of the title
            },
            padding: {
              top: 10, // Padding above the title
              bottom: 20, // Padding below the title
            },
          },
        },
      },
    });

    // Cleanup the chart on component unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data, labels, colors, title]); // Recreate chart when data, labels, colors, or title change

  return <canvas ref={canvasRef}></canvas>;
};

export default PieChart;
