import { MergeType } from "../../enum";
import IToken from "../../token/IToken";
import { SourceId } from "../../type-alias";

export default interface IUserDefineComponent {
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
    mergeType?: MergeType,
    preview?: boolean
  ): void;
}
