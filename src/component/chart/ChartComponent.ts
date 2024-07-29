import { DependencyContainer, inject, injectable } from "tsyringe";
import SourceBaseComponent from "../SourceBaseComponent";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import * as d3 from "d3";
import "./assets/style.css";
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import FunnelChart from "./FunnelChart";
import {
  IBarChartSetting,
  IChartSetting,
  IChartStyle,
  IDonutChartSetting,
} from "../../type-alias";
import DonutChart from "./DonutChart";
import HalfDonutChart from "./HalfDonutChart";
import StackedChart from "./StackedChart";
@injectable()
export default class ChartComponent extends SourceBaseComponent {
  readonly container: DependencyContainer;

  chartSetting: IChartSetting;

  chart: object;

  style: IChartStyle = {
    width: 800,
    height: 400,
    marginX: 40,
    marginY: 40,
    backgroundColor: "#fff",
    textColor: "#000",
    opacity: 1,
    color: ["#004B85", "#FF7A00", "#00A693", "#B40020"],
  };
  chartManager: BarChart | LineChart | FunnelChart;
  constructor(
    @inject("element") element: Element,
    @inject("context") context: IContext,
    @inject("dc") container: DependencyContainer
  ) {
    super(element, context);
    this.container = container;
  }
  public async initializeAsync(): Promise<void> {
    await super.initializeAsync();
  }
  protected async getArgs(): Promise<void> {
    console.log("hhh");
    const [
      chartType,
      group,
      y,
      x,
      chartTitle,
      axisLabel,
      grid,
      legend,
      horizontal,
      hover,
      chartContentVar,
      chartStyle,
      onLabelClick,
    ] = await Promise.all([
      this.getAttributeValueAsync("chartType"),
      this.getAttributeValueAsync("group"),
      this.getAttributeValueAsync("y"),
      this.getAttributeValueAsync("x"),
      this.getAttributeValueAsync("chartTitle"),
      this.getAttributeValueAsync("axisLabel"),
      this.getAttributeValueAsync("grid"),
      this.getAttributeValueAsync("legend"),
      this.getAttributeValueAsync("horizontal", "false"),
      this.getAttributeValueAsync("hover"),
      this.getAttributeValueAsync("chartContent"),
      this.getAttributeValueAsync("chartStyle"),
      this.getAttributeValueAsync("onLabelClick"),
    ]);
    let returnStyleFunc = `if(${chartStyle}) return ${chartStyle};`;
    let styleFunc = new Function(returnStyleFunc);
    let styleVar = styleFunc();
    if (this.style) {
      this.style = { ...this.style, ...styleVar };
    }
    //@ts-ignore
    for (const node of this.node.attributes) {
      if (node.name.startsWith("style_")) {
        this.style[node.name.split("_")[1]] = node.value;
      }
    }
    let returnContentFunc = `if(${chartContentVar}) return ${chartContentVar};`;
    let contentFunc = new Function(returnContentFunc);
    let contentVar = contentFunc();
    this.chartSetting = {
      chartType,
      group,
      y,
      x,
      chartTitle,
      legend: legend == "true",
      hover: hover == "true",
      grid: grid == "true",
      style: this.style,
      axisLabel: axisLabel == "true",
      chartContent: contentVar,
      onLabelClick: eval(onLabelClick),
    };
    (this.chartSetting as IBarChartSetting).horizontal = horizontal == "true";
    (this.chartSetting as IDonutChartSetting).chartContent =
      this.chartSetting.chartContent;
  }
  protected renderSourceAsync(dataSource: ISource): Promise<any> {
    return this.initUIAsync(dataSource.rows);
  }

  public async initUIAsync(data?: any[]): Promise<any> {
    await this.getArgs();

    return this.createChart(data);
  }
  createChart(data) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.chart = d3
      .select(svg)
      .attr("width", Number(this.style.width) + 2 * Number(this.style.marginX))
      .attr(
        "height",
        this.chartSetting.legend
          ? Number(this.style.height) + 2 * Number(this.style.marginY) + 20
          : Number(this.style.height) + 2 * Number(this.style.marginY)
      )
      .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml")
      .style("background-color", this.style.backgroundColor)
      .append("g")
      .attr(
        "transform",
        "translate(" +
          Number(this.style.marginX) +
          "," +
          this.style.marginY +
          ")"
      );

    document.body.appendChild(svg);

    // Create the chart based on the chart type
    switch (this.chartSetting.chartType) {
      case "bar":
        this.chartManager = new BarChart(
          data,
          this.chartSetting as IBarChartSetting,
          this.chart
        );
        break;
      case "stacked":
        this.chartManager = new StackedChart(
          data,
          this.chartSetting as IBarChartSetting,
          this.chart
        );
        break;
      case "line":
        this.chartManager = new LineChart(data, this.chartSetting, this.chart);
        break;
      case "funnel":
        this.chartManager = new FunnelChart(
          data,
          this.chartSetting,
          this.chart
        );
        break;
      case "donut":
        this.chartManager = new DonutChart(data, this.chartSetting, this.chart);
        break;
      case "halfdonut":
        this.chartManager = new HalfDonutChart(
          data,
          this.chartSetting,
          this.chart
        );
        break;
      default:
        throw new Error(
          `Chart type ${this.chartSetting.chartType} is not supported`
        );
    }
    this.chartManager.renderChart();
    this.chartManager.applyFeatures();
    this.setContent(svg, false);
  }
}
