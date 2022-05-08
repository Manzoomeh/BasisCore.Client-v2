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

  public getValidationErrors(): IValidationError {
    const manager = this.command.manager as any as ISchemaBaseComponent;
    let retVal: IValidationError = null;
    if (this.part.validations) {
      try {
        if (typeof manager.validate == "function") {
          retVal = manager.validate(this.part.validations);
        } else if (typeof manager.getValuesForValidate == "function") {
          const values = manager.getValuesForValidate();
          retVal = this.ValidateValue(values);
        } else {
          console.warn(
            `No validation process detect. Add one of validate() or getValuesForValidate() method to '${this.part.viewType}'.`
          );
        }
      } catch (ex) {
        console.error("Error in validation process", ex);
      }
    }
    return retVal;
  }

  public getAdded(): IUserActionPart {
    let retVal: IUserActionPart = null;

    if (!this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getAddedValues == "function") {
          const newValues = manager.getAddedValues();
          if (newValues) {
            retVal = {
              part: this.part.part,
              values: newValues,
            };
          }
        } else {
          console.warn(
            `the getAddedValues() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getAddedValues() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }

  public getEdited(): IUserActionPart {
    let retVal = null;
    if (this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getEditedValues == "function") {
          const editedValues = manager.getEditedValues(this.answer.values);
          if (editedValues) {
            retVal = {
              part: this.part.part,
              values: editedValues,
            };
          }
        } else {
          console.warn(
            `the getEditedValues() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getEditedValues() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }

  public getDeleted(): IUserActionPart {
    let retVal = null;
    if (this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getDeletedValues == "function") {
          const deletedValues = manager.getDeletedValues(this.answer.values);
          if (deletedValues) {
            retVal = {
              part: this.part.part,
              values: deletedValues,
            };
          }
        } else {
          console.warn(
            `the getDeletedValues() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getDeletedValues() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }

  public getSubEdited(): IUserActionPart {
    let retVal = null;
    if (this.answer) {
      const manager = this.command.manager as any as ISchemaBaseComponent;
      try {
        if (typeof manager.getSubEditedValues == "function") {
          const subEditedValues = manager.getSubEditedValues(
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
            `the getSubEditedValues() method not exist in '${this.part.viewType}'!`
          );
        }
      } catch (ex) {
        console.error(
          `Error in getSubEditedValues() of '${this.part.viewType}'!`,
          ex
        );
      }
    }
    return retVal;
  }
}
