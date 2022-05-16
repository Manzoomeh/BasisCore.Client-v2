import Question from "../../question/Question";
import EditableQuestionPart from "../../question-part/EditableQuestionPart";
import { IPartCollection } from "../../IAnswerSchema";
import { IQuestionPart } from "../../IQuestionSchema";
import { IUserActionPart } from "../../IUserActionResult";
import IValidationError from "../../IValidationError";
import layout from "./assets/layout.html";
import BCWrapperFactory from "../../../../../wrapper/BCWrapperFactory";
import UserDefineComponent from "../../../../user-define-component/UserDefineComponent";
import ISchemaBaseComponent from "../../../../user-define-component/ISchemaBaseComponent";

declare const $bc: BCWrapperFactory;

export default class ComponentContainer extends EditableQuestionPart {
  readonly command: UserDefineComponent;
  constructor(part: IQuestionPart, owner: Question, answer: IPartCollection) {
    super(part, layout, owner, answer);
    var commandElement = this.element.querySelector("basis");
    commandElement.setAttribute("core", part.viewType);
    if (part.options) {
      const optionsName = $bc.util.storeAsGlobal(part.options);
      commandElement.setAttribute("options", optionsName);
    }
    var wrapper = $bc.new().addFragment(commandElement).run();
    this.command = wrapper.GetCommandListByCore(
      part.viewType
    )[0] as any as UserDefineComponent;
    if (answer) {
      this.command.onInitialized.then((x) => {
        const manager = x.manager as any as ISchemaBaseComponent;
        manager.setValues(answer.values);
      });
    }
  }

  public async getValidationErrorsAsync(): Promise<IValidationError> {
    const manager = this.command.manager as any as ISchemaBaseComponent;
    let retVal: IValidationError = null;
    if (this.part.validations) {
      try {
        if (typeof manager.validateAsync == "function") {
          retVal = await manager.validateAsync(this.part.validations);
        } else if (typeof manager.getValuesForValidateAsync == "function") {
          const values = await manager.getValuesForValidateAsync();
          retVal = this.ValidateValue(values);
        } else {
          console.warn(
            `No validation process detect. Add one of validateAsync() or getValuesForValidateAsync() method to '${this.part.viewType}'.`
          );
        }
      } catch (ex) {
        console.error("Error in validation process", ex);
      }
    }
    return Promise.resolve(retVal);
  }

  public async getAddedAsync(): Promise<IUserActionPart> {
    let retVal: IUserActionPart = null;

    if (!this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getAddedValuesAsync == "function") {
          const newValues = await manager.getAddedValuesAsync();
          if (newValues) {
            retVal = {
              part: this.part.part,
              values: newValues,
            };
          }
        } else {
          console.warn(
            `the getAddedValuesAsync() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getAddedValuesAsync() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }

  public async getEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getEditedValuesAsync == "function") {
          const editedValues = await manager.getEditedValuesAsync(
            this.answer.values
          );
          if (editedValues) {
            retVal = {
              part: this.part.part,
              values: editedValues,
            };
          }
        } else {
          console.warn(
            `the getEditedValuesAsync() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getEditedValuesAsync() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }

  public async getDeletedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getDeletedValuesAsync == "function") {
          const deletedValues = await manager.getDeletedValuesAsync(
            this.answer.values
          );
          if (deletedValues) {
            retVal = {
              part: this.part.part,
              values: deletedValues,
            };
          }
        } else {
          console.warn(
            `the getDeletedValuesAsync() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getDeletedValuesAsync() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }

  public async getSubEditedAsync(): Promise<IUserActionPart> {
    let retVal = null;
    if (this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getSubEditedValuesAsync == "function") {
          const subEditedValues = await manager.getSubEditedValuesAsync(
            this.answer.values
          );
          if (subEditedValues) {
            retVal = {
              part: this.part.part,
              values: subEditedValues,
            };
          }
        } else {
          console.warn(
            `the getSubEditedValuesAsync() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getSubEditedValuesAsync() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }
}
