import IContext from "../context/IContext";
import ISourceWrapper from "./ISourceWrapper";

export default interface IUtilWrapper {
  cloneDeep<T>(obj: T): T;
  defaultsDeep<T>(data: Partial<T>, defaults: Partial<T>): T;
  getLibAsync(objectName: string, url: string): Promise<any>;
  toNode(rawXML: string): DocumentFragment;
  toHTMLElement(rawXml: string): HTMLElement;
  getComponentAsync(context: IContext, key: string): Promise<any>;

  source: ISourceWrapper;
}