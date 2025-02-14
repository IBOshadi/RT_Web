import React, { useEffect, useRef } from 'react';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title, BarController } from 'chart.js';

// Register necessary elements and controller
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title, BarController);

const BarChart = ({ data, labels, colors, title }) => {
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
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: title,  // Add a label for the dataset to appear in the legend
          data: data,
          backgroundColor: colors,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
              // Title will be displayed at the top of the chart
          },
          legend: {
            position: 'top', // Position legend at the top
          },
        },
        scales: {
          x: {
            beginAtZero: true,
          },
          y: {
            beginAtZero: true,
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

export default BarChart;
