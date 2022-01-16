import { DependencyContainer } from "tsyringe";
import IContext from "../../context/IContext";
import ISourceOptions from "../../context/ISourceOptions";
import ISource from "../../data/ISource";
import { SourceId } from "../../type-alias";
import IBCUtil from "../../wrapper/IBCUtil";
import CommandComponent from "../CommandComponent";

declare const $bc: IBCUtil;

export default abstract class ComponentContainer extends CommandComponent {
  readonly dc: DependencyContainer;

  constructor(
    element: Element,
    context: IContext,
    container: DependencyContainer
  ) {
    super(element, context);
    this.dc = container;
  }

  public toNode(rawHtml: string): DocumentFragment {
    return $bc.util.toNode(rawHtml);
  }

  public toHTMLElement(rawXml: string): HTMLElement {
    return $bc.util.toHTMLElement(rawXml);
  }

  public getDefault<T>(key: string, defaultValue?: T): T {
    return this.context.options.getDefault<T>(key, defaultValue);
  }

  public getSetting<T>(key: string, defaultValue: T): T {
    return this.context.options.getSetting<T>(key, defaultValue);
  }

  public setSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions,
    preview?: boolean
  ): void {
    this.context.setAsSource(sourceId, data, options, preview);
  }

  public tryToGetSource(sourceId: SourceId): ISource {
    return this.context.tryToGetSource(sourceId);
  }

  public waitToGetSourceAsync(sourceId: SourceId): Promise<ISource> {
    return this.context.waitToGetSourceAsync(sourceId);
  }

  public storeAsGlobal(
    data: any,
    name?: string,
    prefix?: string,
    postfix?: string
  ): string {
    return $bc.util.storeAsGlobal(data, name, prefix, postfix);
  }

  public getRandomName(prefix?: string, postfix?: string): string {
    return $bc.util.getRandomName(prefix, postfix);
  }

  public format(pattern: string, ...params: any[]): string {
    return $bc.util.format(pattern, params);
  }
}
