import * as d3 from "d3";
import { IChartSetting } from "../../type-alias";

export default class BarChart {
  data: any[];
  chartSetting: IChartSetting;
  chart: any;

  xScale: any;

  yScale: any;
  constructor(data, chartSetting: IChartSetting, chart: any) {
    this.data = data;
    this.chart = chart;
    this.chartSetting = chartSetting;
  }
  renderChart() {
    const { columnKey, yKey } = this.chartSetting;
    const { width, height } = this.chartSetting.style;
    console.log("this.data :>> ", this.data, columnKey);
    this.xScale = d3
      .scaleBand()
      .domain(this.data.map((d) => d[columnKey]))
      .range([0, width])
      .padding(0.1);

    this.yScale = d3
      .scaleLinear()
      .domain([0, d3.max(this.data, (d) => d[yKey])])
      .range([height, 0]);
    console.log(
      "this.xScale(data[0][columnKey]) :>> ",
      this.xScale(this.data[0][columnKey])
    );
    this.chart
      .selectAll("path")
      .data(this.data)
      .enter()
      .append("path")
      .attr("title", (d) => d[columnKey])
      .attr("class", "bar")
      .attr("d", (item) => {
        console.log("d :>> ", item);
        return (
          "M" +
          this.xScale(item[columnKey]) +
          "," +
          height +
          " v-" +
          (height - this.yScale(item[yKey])) +
          "a 3 , 3 0 0 1 3, -3 l " +
          (this.xScale.bandwidth() - 4) +
          " 0 a 3, 3 0 0 1  3, 3 v" +
          (height - this.yScale(item[yKey]))
        );
      })
      .attr("fill", (d, i) => {
        return d3.schemeCategory10[i];
      });
  }
  applyFeatures() {
    const { height, width, marginY, textColor } = this.chartSetting.style;
    const { chartTitle, axisLabel, hover } = this.chartSetting;
    if (axisLabel) {
      // Add the x-axis

      this.chart
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(this.xScale));

      // Add the y-axis
      this.chart.append("g").call(d3.axisLeft(this.yScale));
    }
    if (chartTitle) {
      // Add the chart title

      this.chart
        .append("text")
        .attr("x", width / 2)
        .attr("y", -marginY / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(chartTitle);
    }
    if (hover) {
      const tooltip = document.createElement("div");

      tooltip.setAttribute("id", "tooltip");
      tooltip.setAttribute("class", "tooltip");
      document.body.appendChild(tooltip);
      const bars = d3.selectAll(".bar");
      const mouseover = function (event) {
        event.target.setAttribute("style", "opacity:0.7");
      };
      const mousemove = function (event) {
        tooltip.innerHTML =
          '<div style="display:flex;flex-direction:column;padding:4px"><div style="padding:3px;display:flex;flex-direction:row;justify-content:space-between;align-items:center;direction:ltr"><div class="colorbox" style="background-color:' +
          event.target.attributes.fill.value +
          '"></div>' +
          event.target.attributes.title.value +
          "</div></div>";
        tooltip.setAttribute(
          "style",
          "top:" +
            (event.pageY - 10) +
            "px;left:" +
            (event.pageX + 80) +
            "px" +
            ";opacity:0.8"
        );
      };
      const mouseleave = function (event) {
        tooltip.setAttribute("style", "opacity:0.0");
        event.target.setAttribute("style", "opacity: 1;");
      };
      bars.on("mousemove", mousemove);
      bars.on("mouseover", mouseover);
      bars.on("mouseleave", mouseleave);
    }
    if (textColor) {
      this.chart.selectAll("text").style("color", textColor);
    }
  }
}
