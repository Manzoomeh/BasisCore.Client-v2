import IContext from "../context/IContext";
import { EventHandler } from "../event/EventHandler";
import ISourceWrapper from "./ISourceWrapper";

export default interface IUtilWrapper {
  cloneDeep<T>(obj: T): T;
  defaultsDeep<T>(data: Partial<T>, defaults: Partial<T>): T;
  getLibAsync(objectName: string, url: string): Promise<any>;
  toNode(rawXML: string): DocumentFragment;
  toHTMLElement(rawXml: string): HTMLElement;
  toElement(rawXML: string): Element;
  getComponentAsync(context: IContext, key: string): Promise<any>;
  storeAsGlobal(
    data: any,
    name?: string,
    prefix?: string,
    postfix?: string
  ): string;
  getRandomName(prefix?: string, postfix?: string): string;
  format(pattern: string, ...params: any[]): string;
  addMessageHandler(messageType: string, handler: EventHandler<any>): boolean;
  source: ISourceWrapper;
}
