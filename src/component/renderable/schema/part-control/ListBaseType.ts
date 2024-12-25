import ComponentCollection from "../../../../ComponentCollection";
import Source from "../../../../data/Source";
import IDictionary from "../../../../IDictionary";
import Util from "../../../../Util";
import IBCUtil from "../../../../wrapper/IBCUtil";
import QuestionPart from "../question-part/QuestionPart";
import IValidationError from "../IValidationError";
import IAnswerSchema, { IPartCollection } from "../IAnswerSchema";
import { IQuestionPart, IFixValue } from "../IQuestionSchema";
import IUserActionResult from "../IUserActionResult";
import EditableQuestionPart from "../question-part/EditableQuestionPart";
import Question from "../question/Question";
import SchemaComponent from "../SchemaComponent";
import { DisplayMode } from "../IFormMakerOptions";

declare const $bc: IBCUtil;
interface ISubSchemaData {
  component: ComponentCollection;
  element: Element;
}
export default abstract class ListBaseType extends EditableQuestionPart {
  protected hasSubSchema: boolean = false;
  private _subSchemaCollections: IDictionary<ISubSchemaData>;
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
    const queryStringParams =
      await this.getQueryStringParamsAsync();
    const data = {
      prpId: this.owner.question.prpId,
      part: this.part.part,
      ...queryStringParams,
    };
    const url = Util.formatString(this.part.link, data);
    const result = await Util.getDataAsync<Array<IFixValue>>(url);
    this.fillUI(result);
  }
  protected async getQueryStringParamsAsync(): Promise<IDictionary<string>> {
    let retVal = await this.owner.options.getQueryStringParamsAsync();
    let hasError = false;
    if (this.part.dependency) {
      retVal = retVal || {};
      const tasks = this.owner.owner.AllQuestions.map((x) =>
        x.getAllValuesAsync()
      );
      const taskResult = await Promise.all(tasks);
      const allValues = taskResult.map((x) => {
        return {
          propId: x.propId,
          parts: x.values.filter((y) => y).flatMap((y) => y.parts),
        };
      });
      this.part.dependency.forEach(async(item) => {
        const relatedProperties = allValues.find((x) => x.propId == item.prpId);
        let relatedParts: QuestionPart[] = null;
        if (relatedProperties) {
          const valuesPart = relatedProperties.parts
            .filter((x) => x.part == item.part)
            .flatMap((x) => x.values);
          if (item.required) {
            relatedParts = this.owner.owner.AllQuestions.filter(
              (x) => x.QuestionSchema.prpId == item.prpId
            )[0].getParts(item.part);
          }

          let value = "";
          if (valuesPart.length > 0) {
            value = JSON.stringify(
              valuesPart.length > 1
                ? valuesPart.map((x) => x.value)
                : valuesPart[0].value
            );
            relatedParts?.forEach((x) => x.updateUIAboutError(null));
          } else if (item.required) {
            const requiredError: IValidationError =
              await this.owner.owner.validationHandler.getError(item.part, "required",{});
            relatedParts.forEach((x) => x.updateUIAboutError(requiredError));
            hasError = true;
          }
          retVal[item.name] = value;
        }
      });
    }
    if (hasError) {
      throw Error("Has empty required part!");
    }
    return retVal;
  }
  protected async getSubSchemaValueAsync(
    id: string
  ): Promise<IUserActionResult> {
    let retVal: IUserActionResult = null;
    if (this._subSchemaCollections) {
      const item = this._subSchemaCollections[id];
      if (item) {
        const array = item.component.GetCommandListByCore("schema");
        if (array?.length == 1) {
          const schemaComponent = array[0] as SchemaComponent;
          retVal = await schemaComponent.getAnswersAsync(false);
        }
      }
    }
    return retVal;
  }

  protected async allSubSchemaIsOkAsync(): Promise<boolean> {
    try {
      let retVal = true;
      if (this.hasSubSchema && this._subSchemaCollections) {
        const checkListTask = Object.getOwnPropertyNames(
          this._subSchemaCollections
        ).map(async (id) => {
          const item = this._subSchemaCollections[id];
          let isOk = true;
          try {
            const array = item.component.GetCommandListByCore("schema");
            if (array?.length == 1) {
              const schemaComponent = array[0] as SchemaComponent;
              await schemaComponent.getAnswersAsync(true);
            }
          } catch (e) {
            isOk = false;
          }
          return isOk;
        });
        const checkList = await Promise.all(checkListTask);
        retVal = checkList.every((x) => x);
      }
      return retVal;
    } catch (ex) {
      console.error("error in validate subSchema", ex);
    }
  }

  protected unloadSchemaAsync(id: string | number): Promise<void> {
    let disposeTask;
    const item = this._subSchemaCollections[id];
    if (item) {
      item.element.innerHTML = "";
      disposeTask = item.component.disposeAsync();
      delete this._subSchemaCollections[id];
    } else {
      disposeTask = Promise.resolve();
    }
    return disposeTask;
  }

  protected async loadSubSchemaAsync(
    id: string | number,
    schemaId: string,
    paramUrl: string,
    schemaVersion: string,
    lid: string | number,
    container: Element,
    answer?: IAnswerSchema
  ): Promise<void> {
    if (!this._subSchemaCollections) {
      this._subSchemaCollections = {};
    }
    let processTask: Promise<void>;
    const options = this.owner.options.subSchemaOptions;
    const displayMode: DisplayMode = answer ? options.displayMode : "new";

    if (schemaId) {
      const sourceId = "sub-schema." + $bc.util.getRandomName();

      const str = `<Basis 
        core="schema" 
        run="atclient" 
        schemaUrl="${options.schemaUrl ?? ""}"
        datamembername="${sourceId}"
        ${paramUrl ? `paramUrl="${paramUrl}"` : ""}
        ${answer ? "" : `id="${schemaId}`}
        ${schemaVersion ? `version="${schemaVersion}"` : ""}
        ${lid ? `lid="${lid}"` : ""}
        ${displayMode ? `displayMode="${displayMode}"` : ""}
        ${options.callback ? `callback="${options.callback}"` : ""}
        ${
          options.schemaCallback
            ? `schemaCallback="${options.schemaCallback}"`
            : ""
        }
        ${options.cell ? `cell="${options.cell}"` : ""}
        >
        </Basis>`;
      container.innerHTML = str;
      const newCollection = this.owner.options.dc.resolve(ComponentCollection);
      this._subSchemaCollections[id] = {
        component: newCollection,
        element: container,
      };
      processTask = newCollection.processNodesAsync(
        Array.from(container.childNodes)
      );
      if (answer) {
        processTask.then(async () => {
          const array = newCollection.GetCommandListByCore("schema");
          if (array?.length == 1) {
            const schemaComponent = array[0] as SchemaComponent;
            const source = new Source(sourceId, answer);
            await schemaComponent.runAsync(source);
          } else {
            console.error("No schema component found for sub-schema");
          }
        });
      }
    } else {
      container.innerHTML = "";
    }
    await processTask;
  }
}
