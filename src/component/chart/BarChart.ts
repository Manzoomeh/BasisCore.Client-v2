import * as d3 from "d3";
import { IBarChartSetting } from "../../type-alias";

export default class BarChart {
  data: any[];
  chartSetting: IBarChartSetting;
  chart: any;

  xScale: any;
  groupScale: any;
  yScale: any;
  constructor(data, chartSetting: IBarChartSetting, chart: any) {
    this.chartSetting = chartSetting;
    this.data = data;
    this.chart = chart;
  }

  renderChart() {
    const { group, x, y, horizontal } = this.chartSetting;
    const { width, height, opacity, color } = this.chartSetting.style;
    if (x && y && group) {
      if (horizontal) {
        this.groupScale = d3
          .scaleBand()
          .domain(new Set(this.data.map((d) => d[group])))
          .range([height, 0])
          .paddingInner(0.1);

        this.xScale = d3
          .scaleBand()
          .domain(new Set(this.data.map((d) => d[x])))
          .range([0, this.groupScale.bandwidth()])
          .padding(0.05);
        this.yScale = d3
          .scaleLinear()
          .domain([0, d3.max(this.data, (d) => d[y])])
          .nice()
          .range([0, width]);
        this.groupScale = d3
          .scaleBand()
          .domain(new Set(this.data.map((d) => d[group])))
          .range([0, height])
          .paddingInner(0.1);
        this.xScale = d3
          .scaleBand()
          .domain(new Set(this.data.map((d) => d[x])))
          .range([0, this.groupScale.bandwidth()])
          .padding(0.05);
        this.yScale = d3
          .scaleLinear()
          .domain([0, d3.max(this.data, (d) => d[y])])
          .nice()
          .range([0, width]);
        this.chart
          .append("g")
          .selectAll()
          .data(d3.group(this.data, (d) => d[group]))
          .join("g")
          .attr(
            "transform",
            ([state]) => `translate(0,${this.groupScale(state)})`
          )
          .selectAll()
          .data(([, d]) => d)
          .join("path")
          .attr("title", (d) => d[group])
          .attr("class", "bar")
          .attr("d", (item) => {
            return (
              "M" +
              0 +
              "," +
              this.xScale(item[x]) +
              " h" +
              (this.yScale(item[y]) - 4) +
              "a3,3 0 0 1 3,3 v " +
              (this.xScale.bandwidth() - 4) +
              " 0 a3,3 0 0 1 -3,3 h-" +
              (this.yScale(item[y]) - 4)
            );
          })
          .attr("fill", (_, i) => {
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
      } else {
        this.groupScale = d3
          .scaleBand()
          .domain(new Set(this.data.map((d) => d[group])))
          .range([0, width])
          .paddingInner(0.1);
        console.log(
          "this.groupScale.bandwidth()",
          this.groupScale.bandwidth(),
          width,
          new Set(this.data.map((d) => d[group]))
        );
        this.xScale = d3
          .scaleBand()
          .domain(new Set(this.data.map((d) => d[x])))
          .range([0, this.groupScale.bandwidth()])
          .padding(0.05);
        this.yScale = d3
          .scaleLinear()
          .domain([0, d3.max(this.data, (d) => d[y])])
          .nice()
          .range([height, 0]);

        this.chart
          .append("g")
          .selectAll()
          .data(d3.group(this.data, (d) => d[group]))
          .join("g")
          .attr(
            "transform",
            ([state]) => `translate(${this.groupScale(state)},0)`
          )
          .selectAll()
          .data(([, d]) => d)
          .join("path")
          .attr("title", (d) => d[group])
          .attr("class", "bar")
          .attr("d", (item) => {
            return (
              "M" +
              this.xScale(item[x]) +
              "," +
              height +
              " v-" +
              (height - this.yScale(item[y]) - 4) +
              "a 3 , 3 0 0 1 3, -3 l " +
              (this.xScale.bandwidth() - 4) +
              " 0 a 3, 3 0 0 1  3, 3 v" +
              (height - this.yScale(item[y]) - 4)
            );
          })

          .attr("fill", (_, i) => {
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
      }
    } else {
      if (horizontal) {
        this.xScale = d3
          .scaleLinear()
          .domain([0, d3.max(this.data, (d) => d[y])])
          .range([0, width]);

        this.yScale = d3
          .scaleBand()
          .domain(this.data.map((d) => d[group]))
          .range([0, height])
          .padding(0.1);
        this.chart
          .selectAll("path")
          .data(this.data)
          .enter()
          .append("path")
          .attr("title", (d) => d[group])
          .attr("class", "bar")
          .attr("d", (item) => {
            return (
              "M" +
              0 +
              "," +
              this.yScale(item[group]) +
              " h" +
              (this.xScale(item[y]) - 4) +
              "a3,3 0 0 1 3,3 v " +
              (this.yScale.bandwidth() - 4) +
              " 0 a3,3 0 0 1 -3,3 h-" +
              (this.xScale(item[y]) - 4)
            );
          })
          .attr("fill", (_, i) => {
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
      } else {
        this.xScale = d3
          .scaleBand()
          .domain(this.data.map((d) => d[group]))
          .range([0, width])
          .padding(0.1);

        this.yScale = d3
          .scaleLinear()
          .domain([0, d3.max(this.data, (d) => d[y])])
          .range([height, 0]);
        this.chart
          .selectAll("path")
          .data(this.data)
          .enter()
          .append("path")
          .attr("title", (d) => d[group])
          .attr("class", "bar")
          .attr("d", (item) => {
            return (
              "M" +
              this.xScale(item[group]) +
              "," +
              height +
              " v-" +
              (height - this.yScale(item[y]) - 4) +
              "a 3 , 3 0 0 1 3, -3 l " +
              (this.xScale.bandwidth() - 4) +
              " 0 a 3, 3 0 0 1  3, 3 v" +
              (height - this.yScale(item[y]) - 4)
            );
          })
          .attr("fill", (_, i) => {
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
          .attr("stroke", (d, i) => {
            return color[i % color.length];
          });
      }
    }
  }
  applyFeatures() {
    const { height, width, marginY, textColor, opacity, color } =
      this.chartSetting.style;
    const {
      chartTitle,
      y,
      axisLabel,
      hover,
      grid,
      group,
      horizontal,
      x,
      legend,
      onLabelClick,
    } = this.chartSetting;
    console.log("onLabelClick", onLabelClick);
    if (axisLabel) {
      // Add the x-axis
      console.log('heree')
      const xAxis = this.chart
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(
          d3
            .axisBottom(
              x ? (horizontal ? this.yScale : this.groupScale) : this.xScale
            )
            .tickSizeOuter(0)
        )
        .call((g) => g.selectAll(".domain").remove());
      // Add the y-axis
      this.chart
        .append("g")
        .call(
          d3.axisLeft(
            x ? (horizontal ? this.groupScale : this.yScale) : this.yScale
          )
        )
      if (onLabelClick) {
        xAxis.selectAll(".tick").on("mousedown", (d, i) =>
          onLabelClick(
            d,
            this.data.find((j) => j[group] == i)
          )
        );
      }
    }
    if (legend && group) {
      var legendElement = this.chart
        .selectAll(".legend")
        .data(this.data)
        .enter()
        .append("foreignObject")
        .attr("x", function (d, i) {
          return i * 75;
        })
        .attr("y", function (d) {
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
        .attr("stroke", (d, i) => {
          return color[i % color.length];
        });
      legendElement
        .append("text")
        .attr("x", 30)
        .attr("y", 10)
        .attr("dy", ".35em")
        .text((d) => {
          return d[x ? x : group];
        });
    }
    if (grid) {
      if (!x) {
        const xGridLines = d3
          .axisBottom(this.xScale)
          .tickSize(-height)
          .tickSizeOuter(0);
        this.chart
          .append("g")
          .attr("class", "grid")
          .attr("transform", `translate(0, ${height})`)
          .call(xGridLines)
          .selectAll("line")
          .attr("stroke-dasharray", "3, 3")
          .attr("opacity", 0.5);
        const yGridLines = d3.axisLeft(this.yScale).tickSize(-width);
        this.chart
          .append("g")
          .attr("class", "grid")
          .call(yGridLines)
          .selectAll("line")
          .attr("stroke-dasharray", "3, 3")
          .attr("opacity", 0.5);
        this.chart.selectAll('.grid').selectAll('text').remove()

      } else {
        const groupCount = new Set(this.data.map((d) => d[x])).size;
        const xCount = new Set(this.data.map((d) => d[group])).size;

        const yDomain = [];
        Array.from(Array(groupCount * xCount)).map(
          (e, i) => (yDomain[i] = String(i))
        );
        const xGridLines = d3
          .axisBottom(horizontal ? this.yScale : this.groupScale)
          .tickSize(horizontal ? -height : -width)
          .tickFormat("");
        this.chart
          .append("g")
          .attr("class", "grid")
          .attr("transform", `translate(0, ${height})`)
          .call(xGridLines)
          .selectAll("line")
          .attr("stroke-dasharray", "3, 3")
          .attr("opacity", 0.5);

        const yGridLines = d3
          .axisLeft(
            horizontal
              ? d3.scaleBand().domain(yDomain).range([0, height]).padding(0.05)
              : this.yScale
          )
          .tickSize(-width)
          .tickFormat("");

        this.chart
          .append("g")
          .attr("class", "grid")
          .call(yGridLines)
          .selectAll("line")
          .attr("stroke-dasharray", "3, 3")
          .attr("opacity", 0.5);
      }
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
        console.log(" event.target.attributes", event.target.attributes);
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
      bars.on("mousemove", mousemove);
      bars.on("mouseover", mouseover);
      bars.on("mouseleave", mouseleave);
    }
    if (textColor) {
      this.chart.selectAll("text").style("color", textColor);
    }
  }
}
