import ComponentCollection from "../../../../ComponentCollection";
import IDictionary from "../../../../IDictionary";
import Util from "../../../../Util";
import { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../IQuestionSchema";
import IUserActionResult from "../IUserActionResult";
import EditableQuestionPart from "../question-part/EditableQuestionPart";
import Question from "../question/Question";
import SchemaComponent from "../SchemaComponent";

export default abstract class ListBaseType extends EditableQuestionPart {
  protected hasSubSchema: boolean = false;
  private _subSchemaCollections: IDictionary<ComponentCollection>;
  constructor(
    part: IQuestionPart,
    layout: string,
    owner: Question,
    answer: IPartCollection
  ) {
    super(part, layout, owner, answer);
    if (this.part.fixValues) {
      this.fillUI(this.part.fixValues);
    } else {
      this.loadFromServerAsync();
    }
  }

  protected fillUI(values: Array<IFixValue>) {
    this.hasSubSchema = values.some((x) => x.schema);
  }
  protected async loadFromServerAsync(): Promise<void> {
    const data = {
      prpId: this.owner.question.prpId,
      part: this.part.part,
    };
    const url = Util.formatString(this.part.link, data);
    const result = await Util.getDataAsync<Array<IFixValue>>(url);
    this.fillUI(result);
  }

  protected getSubSchemaValue(id: string): IUserActionResult {
    let retVal: IUserActionResult = null;
    if (this._subSchemaCollections) {
      const collection = this._subSchemaCollections[id];
      if (collection) {
        const array = collection.GetCommandListByCore("schema");
        if (array?.length == 1) {
          const schemaComponent = array[0] as SchemaComponent;
          retVal = schemaComponent.getAnswers(false);
        }
      }
    }
    return retVal;
  }

  protected allSubSchemaIsOk(): boolean {
    try {
      let retVal = true;
      if (this.hasSubSchema && this._subSchemaCollections) {
        const checkList = Object.getOwnPropertyNames(
          this._subSchemaCollections
        ).map((id) => {
          const collection = this._subSchemaCollections[id];
          console.log("allSubSchemaIsOk-", id, collection);
          let isOk = true;
          try {
            const array = collection.GetCommandListByCore("schema");
            if (array?.length == 1) {
              const schemaComponent = array[0] as SchemaComponent;
              schemaComponent.getAnswers(true);
            }
          } catch (e) {
            console.error(e);
            isOk = false;
          }
          return isOk;
        });
        retVal = checkList.every((x) => x);
        console.log("allSubSchemaIsOk", retVal, checkList);
      }
      console.log(retVal, this);
      return retVal;
    } catch (ex) {
      console.error("error in validate subSchema", ex);
    }
  }

  protected async loadSubSchemaAsync(
    id: string | number,
    schemaId: string,
    schemaVersion: string,
    lid: string | number,
    container: Element
  ): Promise<void> {
    if (!this._subSchemaCollections) {
      this._subSchemaCollections = {};
    }
    const taskList = new Array<Promise<void>>();
    const currentCollection = this._subSchemaCollections[id];
    if (currentCollection) {
      const disposeTask = currentCollection.disposeAsync();
      delete this._subSchemaCollections[id];
      taskList.push(disposeTask);
    }
    const options = this.owner.options.subSchemaOptions;
    if (schemaId) {
      const str = `<Basis 
    core="schema" 
    run="atclient" 
    schemaUrl="${options.schemaUrl ?? ""}" 
    id="${schemaId}" 
    version="${schemaVersion ?? ""}"
    lid="${lid ?? ""}"
    viewMode="${options.viewMode ?? ""}"
    callback="${options.callback ?? ""}"
    schemaCallback="${options.schemaCallback ?? ""}"
    cell="${options.cell ?? ""}"
    >
    </Basis>`;
      container.innerHTML = str;

      const newCollection = this.owner.options.dc.resolve(ComponentCollection);
      this._subSchemaCollections[id] = newCollection;
      const processTask = newCollection.processNodesAsync(
        Array.from(container.childNodes)
      );
      taskList.push(processTask);
    } else {
      container.innerHTML = "";
    }
    await Promise.all(taskList);
  }
}
