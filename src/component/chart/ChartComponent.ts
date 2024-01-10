import { DependencyContainer, inject, injectable } from "tsyringe";
import SourceBaseComponent from "../SourceBaseComponent";
import IContext from "../../context/IContext";
import ISource from "../../data/ISource";
import * as d3 from "d3";
import "./assets/style.css";
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import FunnelChart from "./FunnelChart";
import { IChartSetting } from "../../type-alias";
@injectable()
export default class ChartComponent extends SourceBaseComponent {
  readonly container: DependencyContainer;
  chartType: string;
  xKey: string;
  yKey: string;
  chartTitle: string;
  legend: string;
  axisLabel: string;
  columnKey: string;
  backgroundColor: string;
  height: string;
  width: string;
  marginX: string;
  marginY: string;
  textColor: string;
  hover: string;
  chart: object;

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
    this.chartType = await this.getAttributeValueAsync("chartType");
    this.columnKey = await this.getAttributeValueAsync("columnKey");
    this.yKey = await this.getAttributeValueAsync("yKey");
    this.xKey = await this.getAttributeValueAsync("xKey");
    this.chartTitle = await this.getAttributeValueAsync("chartTitle");
    this.axisLabel = await this.getAttributeValueAsync("axisLabel");
    this.backgroundColor = await this.getAttributeValueAsync("backgroundColor");
    this.width = await this.getAttributeValueAsync("width");
    this.height = await this.getAttributeValueAsync("height");
    this.marginY = await this.getAttributeValueAsync("marginY");
    this.marginX = await this.getAttributeValueAsync("marginX");
    this.textColor = await this.getAttributeValueAsync("textColor");
    this.hover = await this.getAttributeValueAsync("hover");
  }
  protected renderSourceAsync(dataSource: ISource): Promise<any> {
    return this.initUIAsync(dataSource.rows);
  }
  public async initUIAsync(data?: any[]): Promise<any> {
    return this.createChart(data);
  }
  createChart(data) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.chart = d3
      .select(svg)
      .attr("width", Number(this.width) + 2 * Number(this.marginX))
      .attr("height", Number(this.height) + 2 * Number(this.marginY))

      .style("background-color", this.backgroundColor)
      .append("g")
      .attr(
        "transform",
        "translate(" + Number(this.marginX) + "," + this.marginY + ")"
      );

    document.body.appendChild(svg);
    const chartSetting: IChartSetting = {
      chartType: this.chartType,
      columnKey: this.columnKey,
      xKey: this.xKey,
      yKey: this.yKey,
      chartTitle: this.chartTitle,
      legend: this.legend == "true",
      axisLabel: this.axisLabel == "true",
      hover: this.hover == "true",
      style: {
        backgroundColor: this.backgroundColor,
        textColor: this.textColor,
        width: Number(this.width),
        height: Number(this.height),
        marginY: Number(this.marginY),
        marginX: Number(this.marginX),
      },
    };
    // Create the chart based on the chart type
    switch (this.chartType) {
      case "bar":
        this.chartManager = new BarChart(data, chartSetting, this.chart);
        break;
      case "line":
        this.chartManager = new LineChart(data, chartSetting, this.chart);
        break;
      case "funnel":
        this.chartManager = new FunnelChart(data, chartSetting, this.chart);
        break;
      default:
        throw new Error(`Chart type ${this.chartType} is not supported`);
    }
    this.chartManager.renderChart();
    this.chartManager.applyFeatures();
    this.setContent(svg, false);
  }
}
