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
        // Import Chart.js components
        const ChartJS = await import('chart.js');
        const { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } = ChartJS;
        
        // Register components
        Chart.register(
          ArcElement,
          Tooltip,
          Legend,
          CategoryScale,
          LinearScale,
          BarElement,
          Title
        );
        
        // Import chart components
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
  
  // Options for better mobile responsiveness
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
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        },
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10
      }
    }
  };

  // Check if data is valid
  const isProfitDataValid = profitDistributionData && 
    profitDistributionData.datasets && 
    profitDistributionData.datasets.length > 0 && 
    profitDistributionData.datasets[0].data && 
    profitDistributionData.datasets[0].data.length > 0;
    
  const isPerformanceDataValid = performanceMetricsData && 
    performanceMetricsData.datasets && 
    performanceMetricsData.datasets.length > 0 && 
    performanceMetricsData.datasets[0].data && 
    performanceMetricsData.datasets[0].data.length > 0;

  return (
    <>
      <div style={{ height: '250px', marginBottom: '20px' }}>
        {isProfitDataValid ? (
          <PieChart data={profitDistributionData} options={chartOptions} />
        ) : (
          <Banner title="بيانات غير كافية" tone="warning">
            <p>لا توجد بيانات كافية لعرض مخطط توزيع الأرباح</p>
          </Banner>
        )}
      </div>
      <div style={{ height: '250px' }}>
        {isPerformanceDataValid ? (
          <BarChart data={performanceMetricsData} options={chartOptions} />
        ) : (
          <Banner title="بيانات غير كافية" tone="warning">
            <p>لا توجد بيانات كافية لعرض مخطط مؤشرات الأداء</p>
          </Banner>
        )}
      </div>
    </>
  );
}
