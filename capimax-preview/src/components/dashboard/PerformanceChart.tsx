import React from 'react';

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PerformanceChartProps {
  data: ChartDataPoint[];
  title: string;
  type?: 'line' | 'bar' | 'area';
  height?: number;
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  type = 'line',
  height = 200,
  color = '#10b981',
  showGrid = true,
  showTooltip = true,
  className = ''
}) => {
  // Simple SVG-based chart implementation
  // In a real application, you would use Chart.js, Recharts, or similar library
  
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 ${className}`}>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          {title}
        </h3>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <span className="text-4xl mb-4 block opacity-50">📊</span>
            <p className="text-neutral-500 dark:text-slate-400">
              No data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const chartWidth = 400;
  const chartHeight = height;
  const padding = 40;

  // Calculate points for line chart
  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
    const y = padding + ((maxValue - point.value) / range) * (chartHeight - 2 * padding);
    return { x, y, ...point };
  });

  // Create path string for line/area chart
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = type === 'area' 
    ? `${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : pathData;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          {title}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-500 dark:text-slate-400">
            {data.length} data points
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="w-full h-auto"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {/* Grid lines */}
          {showGrid && (
            <g className="opacity-20">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding + ratio * (chartHeight - 2 * padding);
                return (
                  <line
                    key={`h-${ratio}`}
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-neutral-400 dark:text-slate-500"
                  />
                );
              })}
              
              {/* Vertical grid lines */}
              {points.map((point, index) => {
                if (index % Math.ceil(points.length / 5) === 0) {
                  return (
                    <line
                      key={`v-${index}`}
                      x1={point.x}
                      y1={padding}
                      x2={point.x}
                      y2={chartHeight - padding}
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-neutral-400 dark:text-slate-500"
                    />
                  );
                }
                return null;
              })}
            </g>
          )}

          {/* Chart area/line */}
          {type === 'area' && (
            <path
              d={areaPath}
              fill={color}
              fillOpacity="0.1"
              stroke="none"
            />
          )}
          
          {(type === 'line' || type === 'area') && (
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {(type === 'line' || type === 'area') && points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
              className="hover:r-6 transition-all cursor-pointer"
            />
          ))}

          {/* Bars for bar chart */}
          {type === 'bar' && points.map((point, index) => {
            const barWidth = (chartWidth - 2 * padding) / data.length * 0.8;
            const barHeight = ((point.value - minValue) / range) * (chartHeight - 2 * padding);
            const barX = point.x - barWidth / 2;
            const barY = chartHeight - padding - barHeight;
            
            return (
              <rect
                key={index}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}

          {/* Y-axis labels */}
          <g className="text-xs text-neutral-400 dark:text-slate-500">
            {[maxValue, (maxValue + minValue) / 2, minValue].map((value, index) => {
              const y = padding + index * ((chartHeight - 2 * padding) / 2);
              return (
                <text
                  key={value}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-current"
                >
                  ${value.toLocaleString()}
                </text>
              );
            })}
          </g>

          {/* X-axis labels */}
          <g className="text-xs text-neutral-400 dark:text-slate-500">
            {points.map((point, index) => {
              if (index % Math.ceil(points.length / 4) === 0) {
                const date = new Date(point.date);
                return (
                  <text
                    key={index}
                    x={point.x}
                    y={chartHeight - padding + 15}
                    textAnchor="middle"
                    className="fill-current"
                  >
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                );
              }
              return null;
            })}
          </g>
        </svg>
      </div>

      {/* Chart Stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200 dark:border-slate-700">
        <div className="flex items-center space-x-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-slate-400">Current: </span>
            <span className="font-semibold text-neutral-900 dark:text-slate-100">
              ${data[data.length - 1]?.value.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-slate-400">Change: </span>
            <span className={`font-semibold ${
              data[data.length - 1]?.value > data[0]?.value 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {data.length > 1 && (
                ((data[data.length - 1].value - data[0].value) / data[0].value * 100).toFixed(1)
              )}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};