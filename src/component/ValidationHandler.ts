import IValidationError from "./renderable/schema/IValidationError";
import {
  ValidationErrorType,
  IValidationErrorPart,
} from "./renderable/schema/IValidationError";

let validationObject = {
  required: {
    fa: "پر کردن این فیلد الزامیست",
    en: "this field is required.",
  },
  regex: {
    fa: `فرمت وارد شده صحیح نیست.`,
    en: "invalid format",
  },

  type: {
    fa: "عدد وارد شده صحیح نیست",
    en: "invalid type of variable.",
  },

  length: {
    fa: "طول رشته وارد شده باید در بازه ${minLength} و ${maxLength} باشد",
    en: "the length of string should be in range of ${minLength} and ${maxLength}.",
  },

  mime: {
    fa: "نوع فایل در بین انواع فایل مجاز (${mimesArray}) نیست",
    en: "the file mime is not in valid mimes (${mimesArray})",
  },

  "mime-size": {
    fa: "سایز فایل در بین سایزهای فایل مجاز (${mimeSizeArray}) نیست",
    en: "the file size are not in valid mime size array (${mimeSizeArray})",
  },

  range: {
    fa: "عدد وارد شده باید در بازه ${min} و ${max} باشد",
    en: "the entered number should be in range of ${min} and ${max}. ",
  },

  size: {
    fa: "حجم فایل بیشتر از حجم مجاز (${size}) است.",
    en: "the file size is more than valid size (${size}) ",
  },

  "sub-schema": {},
};

export default class ValidationHandler {
  culture: string;
  url?: string;
  config?: NodeJS.Dict<string>;
  ifSentenceApiFetched: boolean;
  constructor(
    lid: number,
    configObj?: { validationErrors: NodeJS.Dict<string>; messagesApi: string }
  ) {
    this.culture =
      lid == 1
        ? "fa"
        : lid == 2
        ? "en"
        : lid == 3
        ? "ar"
        : lid == 4
        ? "fr"
        : lid == 5
        ? "de"
        : lid == 6
        ? "es"
        : lid == 7
        ? "ru"
        : lid == 8
        ? "zh"
        : lid == 9
        ? "tr"
        : lid == 10
        ? "ka"
        : lid == 11
        ? "hy"
        : lid == 12
        ? "az"
        : lid == 13
        ? "id"
        : lid == 14
        ? "th"
        : lid == 15
        ? "ur"
        : lid == 16
        ? "hi"
        : "fa";
    if (configObj) {
      this.config = configObj.validationErrors;
      this.url = configObj.messagesApi;
    }

    this.ifSentenceApiFetched = false;
  }
  async getError(
    part: number,
    errorType: ValidationErrorType,
    params: any
  ): Promise<IValidationError> {
    if (!this.ifSentenceApiFetched && this.url && this.config) {
      await this.fetchSentences();
      this.ifSentenceApiFetched = true;
    }
    return {
      part: part,
      title: errorType,
      errors: [
        {
          type: errorType,
          description: this.getErrorString(errorType, params),
          params: params,
        },
      ],
    };
  }
  async getErrorElement(
    errorType: ValidationErrorType,
    params: any
  ): Promise<IValidationErrorPart> {
    if (!this.ifSentenceApiFetched && this.url && this.config) {
      await this.fetchSentences();
      this.ifSentenceApiFetched = true;
    }
    return {
      type: errorType,
      description: this.getErrorString(errorType, params),
      params: params,
    };
  }
  replacePlaceholders(str, obj) {
    return str.replace(/\$\{([^}]+)\}/g, (match, p1) => {
      return obj[p1] !== undefined ? obj[p1] : match;
    });
  }
  async fetchSentences(): Promise<void> {
    const response = await fetch(`${this.url}/${this.culture}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", 
      },
      body: JSON.stringify({
        sentenceId: Object.values(this.config),
      }),
    });
    const data = await response.json();
    data.forEach((sentence: { id: string; title: string }) => {
      const key = this.findKeyByValue(this.config, sentence.id);
      validationObject[key][this.culture] = sentence.title;
    });
  }
  getErrorString(errorType: string, params): string {
    return this.replacePlaceholders(
      validationObject[errorType][this.culture],
      params
    );
  }
  findKeyByValue(obj, valueToFind) {
    return Object.keys(obj).find((key) => obj[key] === valueToFind);
  }
}
