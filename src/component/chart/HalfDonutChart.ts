import * as d3 from "d3";
import { IDonutChartSetting } from "../../type-alias";

export default class HalfDonutChart {
  data: any[];
  chartSetting: IDonutChartSetting;
  chart: any;

  xScale: any;
  radius: number;
  yScale: any;
  constructor(data, chartSetting: IDonutChartSetting, chart: any) {
    this.data = data;
    this.chart = chart;
    this.chartSetting = chartSetting;
    this.radius =
      this.chartSetting.style.height > this.chartSetting.style.width
        ? this.chartSetting.style.height
        : this.chartSetting.style.width / 2;
  }
  renderChart() {
    const { group, y, legend, chartContent } = this.chartSetting;
    const {
      width,
      height,
      cornerRadius,
      innerRadiusDistance,
      outerRadiusDistance,
      opacity,
      color,
      padAngel,
    } = this.chartSetting.style;

    var arc = d3
      .arc()
      .padAngle(padAngel || 0)
      .outerRadius(this.radius - (outerRadiusDistance || 10))
      .innerRadius(this.radius - (innerRadiusDistance || 70))
      .cornerRadius(cornerRadius || 0);

    var pie = d3
      .pie()
      .padAngle(padAngel || 0)
      .startAngle(-0.5 * Math.PI)
      .endAngle(0.5 * Math.PI)
      .sort(null)
      .value((d) => {
        return d[y];
      });

    var svg = this.chart
      .attr("width", width)
      .attr("height", legend ? height + 30 : height)
      .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height + ")");

    var g = svg.selectAll(".arc").data(pie(this.data)).enter().append("g");

    g.append("path")
      .attr("class", "arc")

      .attr("d", arc)
      .attr("title", (d) => {
        return d.data[group];
      })
      .attr("fill", (d) => {
        var rgb = d3.rgb(color[d.index % color.length]);
        return (
          "rgba(" +
          rgb.r +
          "," +
          rgb.g +
          "," +
          rgb.b +
          ", " +
          (opacity || 1.0) +
          ")"
        );
      })
      .attr("stroke", (d) => {
        return color[d.index];
      })
      .attr("rx", 10) // Add border radius to the path
      .attr("ry", 10); // Add border radius to the path

    if (chartContent) {
      this.chart
        .append("foreignObject")
        .attr("x", () => {
          return (
            this.radius -
            ((this.radius - (innerRadiusDistance || 70)) * Math.sqrt(2)) / 2
          );
        })
        .attr("y", (d) => {
          return (
            height -
            ((this.radius - (innerRadiusDistance || 70)) * Math.sqrt(2)) / 2 +
            10
          );
        })
        .attr(
          "width",
          (this.radius - (innerRadiusDistance || 70)) * Math.sqrt(2) - 10
        )
        .attr(
          "height",
          ((this.radius - (innerRadiusDistance || 70)) * Math.sqrt(2)) / 2 - 10
        )
        .html(chartContent);
    }
  }
  applyFeatures() {
    const {
      height,
      width,
      marginY,
      textColor,
      opacity,
      color,
      padAngel,
      outerRadiusDistance,
      innerRadiusDistance,
      cornerRadius,
    } = this.chartSetting.style;
    const { chartTitle, hover, legend, group, axisLabel } = this.chartSetting;
    var arc = d3
      .arc()
      .padAngle(padAngel || 0)
      .outerRadius(this.radius - (outerRadiusDistance || 10))
      .innerRadius(this.radius - (innerRadiusDistance || 70))
      .cornerRadius(cornerRadius || 0);

    if (axisLabel) {
      this.chart
        .selectAll(".arc")
        .append("text")
        .attr("transform", (d) => {
          return "translate(" + arc.centroid(d) + ")";
        })
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text((d) => {
          if (group) {
            return d.data[group];
          } else {
            return null;
          }
        });
    }
    if (legend && group) {
      var legendElement = this.chart
        .selectAll(".legend")
        .data(this.data)
        .enter()
        .append("foreignObject")
        .attr("x", function (_, i) {
          return i * 75;
        })
        .attr("y", function () {
          return height + 20;
        })
        .attr("width", 100)
        .attr("height", 100)
        .append("xhtml:div")
        .attr("class", "legend");

      legendElement
        .append("svg")
        .attr("width", 24)
        .attr("height", 12)
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 24)
        .attr("height", 12)
        .attr("rx", 5)
        .attr("fill", (d, i) => {
          var rgb = d3.rgb(color[i % color.length]);
          return (
            "rgba(" +
            rgb.r +
            "," +
            rgb.g +
            "," +
            rgb.b +
            ", " +
            (opacity || 1.0) +
            ")"
          );
        })
        .attr("stroke", (_, i) => {
          return color[i % color.length];
        });
      legendElement
        .append("text")
        .attr("x", 30)
        .attr("y", 10)
        .attr("dy", ".35em")
        .text((d) => {
          return d[group];
        });
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
      const arcs = d3.selectAll(".arc");
      const mouseover = function (event) {
        event.target.setAttribute("style", "opacity:0.7");
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
        event.target.setAttribute("style", "opacity: 1;");
      };
      arcs.on("mousemove", mousemove);
      arcs.on("mouseover", mouseover);
      arcs.on("mouseleave", mouseleave);
    }
    if (textColor) {
      this.chart.selectAll("text").style("color", textColor);
    }
  }
}
