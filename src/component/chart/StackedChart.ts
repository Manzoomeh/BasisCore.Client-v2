import * as d3 from "d3";
import { IStackedChartSetting } from "../../type-alias";

export default class StackedChart {
  data: any[];
  chartSetting: IStackedChartSetting;
  chart: any;

  total: number
  xScale: any;

  yScale: any;
  constructor(data, chartSetting: IStackedChartSetting, chart: any) {
    this.chartSetting = chartSetting;
    this.total = d3.sum(data, d => d[this.chartSetting.y]);
    this.data = this.groupDataFunc(data);
    this.chart = chart;

  }

  renderChart() {
    const { group, y, horizontal } = this.chartSetting;
    const { width, height, opacity, color, thickness: settingThickness } = this.chartSetting.style;
    const thickness = settingThickness || horizontal ? height / 2 : width / 2

    if (horizontal) {
      this.xScale =
        d3.scaleLinear()
          .domain([0, this.total])
          .range([0, width])







      this.chart
        .selectAll('g')
        .data(this.data)
        .join('g')
        .attr('class', 'rect-stacked')
        .append('rect')
        .attr('x', d => this.xScale(d.cumulative))
        .attr('y', (height / 2) - (thickness / 2))
        .attr('title', d => d.label)
        .attr('height', thickness)
        .attr('width', d => this.xScale(d.value))
        .attr('fill', (_, i) => {
          const v = d3.rgb(color[i % color.length])
          v.opacity = opacity
          return v
        })
        .attr('stroke', (d, i) => color[i % color.length]).style('stroke-dasharray', (d) => `${this.xScale(d.value)},${thickness}`);
    } else {

      this.yScale = d3.scaleLinear()
        .domain([0, this.total])
        .range([0, height])
      this.chart
        .selectAll('g')
        .data(this.data)
        .join('g')
        .attr('class', 'rect-stacked')
        .append('rect')
        .attr('x', (width / 2) - (thickness / 2))
        .attr('y', d => this.yScale(d.cumulative))
        .attr('height', d => this.yScale(d.value))
        .attr('width', thickness)
        .attr('title', d => this.yScale(d.label))
        .attr('fill', (_, i) => {
          const v = d3.rgb(color[i % color.length])
          v.opacity = opacity
          return v
        })
        .attr('stroke', (d, i) => color[i % color.length]).style('stroke-dasharray', (d) => `${thickness},${this.yScale(d.value)},${thickness}`);
    }


  }
  applyFeatures() {
    const { height, width, marginY, textColor, opacity, color } = this.chartSetting.style;
    const { chartTitle, axisLabel, hover, grid, group, legend, horizontal } = this.chartSetting;

    if (axisLabel) {
      if (horizontal) {

        this.chart.selectAll('.rect-stacked').append('text')
          .attr('class', 'text-percent')
          .attr('text-anchor', 'middle')
          .attr('x', d => this.xScale(d.cumulative) + (this.xScale(d.value) - 40))
          .attr('y', (height / 2) - 40)
          .text(d => Math.floor(d.percent) + ' %').attr('fill', (d, i) => color[i % color.length]).attr('font-weight', '700').attr('font-size', '20')
        this.chart.selectAll('.rect-stacked').append('text')
          .attr('class', 'text-percent')
          .attr('text-anchor', 'middle')
          .attr('x', d => this.xScale(d.cumulative) + (this.xScale(d.value) - 40))
          .attr('y', (height / 2))
          .text(d => ` مورد ${this.total}/${d.value}`).attr('fill', (d, i) => color[i % color.length])
      } else {
        this.chart.selectAll('.rect-stacked').append('text')
          .attr('class', 'text-percent')
          .attr('text-anchor', 'middle')
          .attr('x', (width / 2))
          .attr('y', (d) => this.yScale(d.cumulative) + (this.yScale(d.value) / 2))
          .text(d => Math.floor(d.percent) + ' %').attr('fill', (d, i) => color[i % color.length]).attr('font-weight', '700').attr('font-size', '20')

      }

    }
    if (legend && group) {
      var legendElement = this.chart.selectAll(".legend")
        .data(this.data)
        .enter().append("foreignObject").attr('x', (d, i) => {
          return (width / this.data.length + 1) * i;
        })
        .attr('y', function () {
          return height + 20
        })
        .attr('width', 100)
        .attr('height', 100).append('xhtml:div')
        .attr("class", "legend")

      legendElement.append('svg').attr("width", 24)
        .attr("height", 12)
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 24)
        .attr("height", 12).attr("rx", 5)
        .attr("fill", (_, i) => {
          var rgb = d3.rgb(color[i % color.length]);
          return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ", " + (opacity || 1.0) + ")";
        })
        .attr("stroke", (d, i) => {
          return color[i % color.length];
        })
      legendElement.append("text")
        .attr("x", 30)
        .attr("y", 10)
        .attr("dy", ".35em")
        .text((d) => { return d.label; });
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
      const bars = d3.selectAll("rect");
      const mouseover = function (event) {
        event.target.style.opacity = '0.7'
      };
      const mousemove = function (event) {
        tooltip.innerHTML =
          '<div style="display:flex;flex-direction:column;padding:4px"><div style="padding:3px;display:flex;flex-direction:row;justify-content:space-between;align-items:center;direction:ltr"><div class="colorbox" style="background-color:' +
          event.target.attributes.stroke.value +
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
        event.target.style.opacity = '1'
      };
      bars.on("mousemove", mousemove);
      bars.on("mouseover", mouseover);
      bars.on("mouseleave", mouseleave);
    }
    if (textColor) {
      this.chart.selectAll("text").style("color", textColor);
    }
  }
  groupDataFunc(data) {
    const { group, y } = this.chartSetting
    const percent = d3.scaleLinear()
      .domain([0, this.total])
      .range([0, 100])
    let cumulative = 0
    const _data = data.map(d => {
      cumulative += Number(d[y])
      return {
        value: d[y],
        cumulative: cumulative - d[y],
        label: d[group],
        percent: percent(d[y])
      }
    }).filter(d => d.value > 0)
    return _data
  };
}
