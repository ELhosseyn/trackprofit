import { useEffect, useState } from 'react';
import { Banner, Spinner } from '@shopify/polaris';

export default function ChartComponents({ profitDistributionData, performanceMetricsData }) {
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [PieChart, setPieChart] = useState(null);
  const [BarChart, setBarChart] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadChartComponents = async () => {
      try {
        // Import Chart.js components first
        const ChartJS = await import('chart.js');
        const { 
          Chart, 
          ArcElement, 
          Tooltip, 
          Legend, 
          CategoryScale, 
          LinearScale, 
          BarElement, 
          Title,
          PointElement,
          LineElement,
          Filler
        } = ChartJS;
        
        // Register all necessary components
        Chart.register(
          ArcElement,
          Tooltip,
          Legend,
          CategoryScale,
          LinearScale,
          BarElement,
          Title,
          PointElement,
          LineElement,
          Filler
        );
        
        // Import chart components from react-chartjs-2
        const reactChartjs = await import('react-chartjs-2');
        
        if (isMounted) {
          setPieChart(() => reactChartjs.Pie);
          setBarChart(() => reactChartjs.Bar);
          setIsChartLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load chart components:', error);
        if (isMounted) {
          setChartError('Failed to load chart components. Please refresh the page.');
        }
      }
    };
    
    loadChartComponents();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  if (chartError) {
    return (
      <Banner title="خطأ في تحميل الرسوم البيانية" tone="critical">
        <p>{chartError}</p>
      </Banner>
    );
  }
  
  if (!isChartLoaded || !PieChart || !BarChart) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spinner size="large" />
      </div>
    );
  }
  
  // Options for better mobile responsiveness and RTL support
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          padding: 10,
          font: {
            size: 12
          },
          usePointStyle: true
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        displayColors: true,
        boxWidth: 12,
        boxHeight: 12,
        cornerRadius: 4,
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${new Intl.NumberFormat('ar-DZ').format(value)} (${percentage}%)`;
          }
        }
      }
    },
    layout: {
      padding: 10
    }
  };

  // Check if data is valid with better validation
  const isProfitDataValid = profitDistributionData && 
    profitDistributionData.datasets && 
    profitDistributionData.datasets.length > 0 && 
    profitDistributionData.datasets[0].data && 
    profitDistributionData.datasets[0].data.length > 0 &&
    profitDistributionData.datasets[0].data.some(value => value > 0);
    
  const isPerformanceDataValid = performanceMetricsData && 
    performanceMetricsData.datasets && 
    performanceMetricsData.datasets.length > 0 && 
    performanceMetricsData.datasets[0].data && 
    performanceMetricsData.datasets[0].data.length > 0 &&
    performanceMetricsData.datasets[0].data.some(value => value > 0);

  return (
    <>
      <div style={{ height: '300px', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          توزيع الأرباح والتكاليف
        </h3>
        {isProfitDataValid ? (
          <PieChart data={profitDistributionData} options={chartOptions} />
        ) : (
          <Banner title="بيانات غير كافية" tone="warning">
            <p>لا توجد بيانات كافية لعرض مخطط توزيع الأرباح</p>
          </Banner>
        )}
      </div>
      <div style={{ height: '300px' }}>
        <h3 style={{ marginBottom: '15px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          مؤشرات الأداء
        </h3>
        {isPerformanceDataValid ? (
          <BarChart data={performanceMetricsData} options={{
            ...chartOptions,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0,0,0,0.1)'
                },
                ticks: {
                  font: {
                    size: 12
                  }
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    size: 12
                  }
                }
              }
            }
          }} />
        ) : (
          <Banner title="بيانات غير كافية" tone="warning">
            <p>لا توجد بيانات كافية لعرض مخطط مؤشرات الأداء</p>
          </Banner>
        )}
      </div>
    </>
  );
}
