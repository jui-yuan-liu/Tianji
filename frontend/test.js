import { createChart, CandlestickSeries } from 'lightweight-charts';
const chart = createChart(document.createElement('div'));
const series = chart.addSeries(CandlestickSeries);
console.log("Success", series.seriesType());
