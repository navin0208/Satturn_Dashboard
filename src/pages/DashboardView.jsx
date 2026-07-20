import React from 'react';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import { Wind, Thermometer, Droplets, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import './Dashboard.css';

const DashboardView = () => {
  const { user } = useAuth();

  if (user?.role === 'USER') {
    return <Navigate to="/dashboard/my-devices" replace />;
  }
  // Aggregate Metrics over all user devices (Mock)
  const metrics = [
    { title: "Average AQI", value: "34", unit: "", icon: Activity, trend: { isPositive: true, value: 2.4 }, colorClass: 'cyan' },
    { title: "Avg PM2.5", value: "19", unit: "µg/m³", icon: Wind, trend: { isPositive: false, value: 5.1 }, colorClass: 'purple' },
    { title: "Avg Temperature", value: "28", unit: "°C", icon: Thermometer, colorClass: 'blue' },
    { title: "Avg Humidity", value: "27", unit: "%", icon: Droplets, colorClass: 'cyan' },
  ];

  return (
    <div className="dashboard-view fade-in">
      <div className="metrics-grid">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>
      
      <div className="table-wrapper">
        <DataTable />
      </div>
    </div>
  );
};

export default DashboardView;
