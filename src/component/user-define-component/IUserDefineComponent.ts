import { DependencyContainer } from "tsyringe";
import ISourceOptions from "../../context/ISourceOptions";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import IComponentCollection from "../../IComponentCollection";
import RangeObject from "../../RangeObject/RangeObject";
import IToken from "../../token/IToken";
import { SourceId } from "../../type-alias";
import IComponentManager from "./IComponentManager";

export default interface IUserDefineComponent {
  content: DocumentFragment;
  range: RangeObject;
  triggers: string[];
  priority: Priority;
  dc: DependencyContainer;
  toNode(rawHtml: string): DocumentFragment;
  toHTMLElement(rawXml: string): HTMLElement;
  setContent(newContent: Node): void;
  getAttributeValueAsync(name: string, defaultValue?: string): Promise<string>;
  getAttributeBooleanValueAsync(
    name: string,
    defaultValue?: boolean
  ): Promise<Boolean>;
  getAttributeToken(attributeName: string): IToken<string>;
  addTrigger(sourceIds: Array<SourceId>);
  setSource(
    sourceId: SourceId,
    data: any,
    options?: ISourceOptions,
    preview?: boolean
  ): void;
  tryToGetSource(sourceId: SourceId): ISource;
  waitToGetSourceAsync(sourceId: SourceId): Promise<ISource>;
  getDefault<T>(key: string, defaultValue?: T): T;
  getSetting<T>(key: string, defaultValue: T): T;
  processNodesAsync(nodes: Array<Node>): Promise<IComponentCollection>;
  disposeAsync(): Promise<void>;
  disposed: boolean;
  storeAsGlobal(
    data: any,
    name?: string,
    prefix?: string,
    postfix?: string
  ): string;
  getRandomName(prefix?: string, postfix?: string): string;
  format(pattern: string, ...params: any[]): string;
  getLibAsync(objectName: string, url: string): Promise<any>;
  manager: IComponentManager;
  onInitialized: Promise<IUserDefineComponent>;
  node: Element;
}
