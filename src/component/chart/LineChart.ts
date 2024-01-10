import * as d3 from "d3";
import { IChartSetting } from "../../type-alias";

export default class LineChart {
  data: any[];
  chartSetting: IChartSetting;
  chart: any;

  xScale: any;

  yScale: any;
  constructor(data, chartSetting, chart) {
    this.data = data;
    this.chart = chart;
    this.chartSetting = chartSetting;
  }
  renderChart() {
    const { xKey, yKey, columnKey } = this.chartSetting;
    const { width, height } = this.chartSetting.style;
    console.log("xKey :>> ", this.chartSetting);
    this.xScale = d3
      .scaleLinear()
      .domain(d3.extent(this.data, (d) => d[xKey]))
      .range([0, width]);

    this.yScale = d3
      .scaleLinear()
      .domain(d3.extent(this.data, (d) => d[yKey]))
      .range([height, 0]);

    if (!columnKey) {
      const line = d3
        .line()
        .x((d) => this.xScale(d[xKey]))
        .y((d) => this.yScale(d[yKey]));
      this.chart
        .append("path")
        .datum(this.data)
        .attr("title", (d) => {
          return d[xKey];
        })
        .attr("d", line)
        .attr("class", "line")
        .style("fill", "none")
        .attr("stroke", (_, i) => {
          return d3.schemeCategory10[i];
        });
    } else {
      const addredatedData = d3.group(this.data, (d) => d[columnKey]);

      this.chart
        .selectAll(".line")
        .data(addredatedData)
        .join("path")
        .attr("title", (d) => {
          console.log("d :>> ", d);
          return d[0];
        })
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .attr("d", (d) => {
          console.log("object :>> ", d, d[xKey], this.xScale(d[xKey]), xKey);
          return d3
            .line()
            .x((d) => {
              return this.xScale(d[xKey]);
            })
            .y((d) => {
              return this.yScale(d[yKey]);
            })(d[1]);
        })

        .attr("stroke", (_, i) => {
          return d3.schemeCategory10[i];
        });
    }
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

      const lines = d3.selectAll(".line");
      const mouseover = function (d) {
        d.target.setAttribute("style", "opacity:0.7;fill:none");
      };
      const mousemove = function (event, d) {
        tooltip.innerHTML =
          '<div style="display:flex;flex-direction:column;padding:4px"><div style="padding:3px;display:flex;flex-direction:row;justify-content:space-between;align-items:center;direction:ltr"><div class="colorbox" style="background-color:' +
          event.target.attributes.stroke.value +
          '"></div>' +
          event.target.attributes.title?.value +
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
      const mouseleave = function (d) {
        tooltip.setAttribute("style", "opacity:0.0");
        d.target.setAttribute("style", "opacity: 1;fill:none");
      };
      lines.on("mousemove", mousemove);
      lines.on("mouseover", mouseover);
      lines.on("mouseleave", mouseleave);
    }
    if (textColor) {
      this.chart.selectAll("text").style("color", textColor);
    }
  }
}
