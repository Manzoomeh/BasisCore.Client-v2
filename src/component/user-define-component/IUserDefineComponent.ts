import ISourceOptions from "../../context/ISourceOptions";
import ISource from "../../data/ISource";
import { Priority } from "../../enum";
import IToken from "../../token/IToken";
import { SourceId } from "../../type-alias";

export default interface IUserDefineComponent {
  content: DocumentFragment;
  range: Range;
  triggers: string[];
  priority: Priority;
  toNode(rawHtml: string): Node;
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
}
