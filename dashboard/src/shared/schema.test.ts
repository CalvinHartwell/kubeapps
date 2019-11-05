import { JSONSchema4 } from "json-schema";

import { getValue, retrieveBasicFormParams, setValue, validate } from "./schema";
import { IBasicFormParam } from "./types";

describe("retrieveBasicFormParams", () => {
  [
    {
      description: "should retrieve a param",
      values: "user: andres",
      schema: { properties: { user: { type: "string", form: true } } } as JSONSchema4,
      result: [
        {
          path: "user",
          value: "andres",
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve a param without default value",
      values: "user:",
      schema: { properties: { user: { type: "string", form: true } } } as JSONSchema4,
      result: [
        {
          path: "user",
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve a param with default value in the schema",
      values: "user:",
      schema: {
        properties: { user: { type: "string", form: true, default: "michael" } },
      } as JSONSchema4,
      result: [
        {
          path: "user",
          value: "michael",
        } as IBasicFormParam,
      ],
    },
    {
      description: "values prevail over default values",
      values: "user: foo",
      schema: {
        properties: { user: { type: "string", form: true, default: "bar" } },
      } as JSONSchema4,
      result: [
        {
          path: "user",
          value: "foo",
        } as IBasicFormParam,
      ],
    },
    {
      description: "it should return params even if the values don't include it",
      values: "foo: bar",
      schema: {
        properties: { user: { type: "string", form: true, default: "andres" } },
      } as JSONSchema4,
      result: [
        {
          path: "user",
          value: "andres",
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve a nested param",
      values: "credentials:\n  user: andres",
      schema: {
        properties: {
          credentials: {
            type: "object",
            properties: { user: { type: "string", form: true } },
          },
        },
      } as JSONSchema4,
      result: [
        {
          path: "credentials.user",
          value: "andres",
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve several params and ignore the ones not marked",
      values: `
# Application Credentials
credentials:
  admin:
    user: andres
    pass: myPassword

# Number of Replicas
replicas: 1

# Service Type
service: ClusterIP
`,
      schema: {
        properties: {
          credentials: {
            type: "object",
            properties: {
              admin: {
                type: "object",
                properties: {
                  user: { type: "string", form: true },
                  pass: { type: "string", form: true },
                },
              },
            },
          },
          replicas: { type: "number", form: true },
          service: { type: "string" },
        },
      } as JSONSchema4,
      result: [
        {
          path: "credentials.admin.user",
          value: "andres",
        } as IBasicFormParam,
        {
          path: "credentials.admin.pass",
          value: "myPassword",
        } as IBasicFormParam,
        {
          path: "replicas",
          value: 1,
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve a param with title and description",
      values: "blogName: myBlog",
      schema: {
        properties: {
          blogName: {
            type: "string",
            form: true,
            title: "Blog Name",
            description: "Title of the blog",
          },
        },
      } as JSONSchema4,
      result: [
        {
          path: "blogName",
          type: "string",
          value: "myBlog",
          title: "Blog Name",
          description: "Title of the blog",
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve a param with children params",
      values: `
externalDatabase:
  name: "foo"
  port: 3306
`,
      schema: {
        properties: {
          externalDatabase: {
            type: "object",
            form: true,
            properties: {
              name: { type: "string", form: true },
              port: { type: "integer", form: true },
            },
          },
        },
      } as JSONSchema4,
      result: [
        {
          path: "externalDatabase",
          type: "object",
          children: [
            {
              path: "externalDatabase.name",
              type: "string",
            },
            {
              path: "externalDatabase.port",
              type: "integer",
            },
          ],
        } as IBasicFormParam,
      ],
    },
    {
      description: "should retrieve a false param",
      values: "foo: false",
      schema: {
        properties: {
          foo: { type: "boolean", form: true },
        },
      } as JSONSchema4,
      result: [{ path: "foo", type: "boolean", value: false } as IBasicFormParam],
    },
  ].forEach(t => {
    it(t.description, () => {
      expect(retrieveBasicFormParams(t.values, t.schema)).toMatchObject(t.result);
    });
  });
});

describe("getValue", () => {
  [
    {
      description: "should return a value",
      values: "foo: bar",
      path: "foo",
      result: "bar",
    },
    {
      description: "should return a nested value",
      values: "foo:\n  bar: foobar",
      path: "foo.bar",
      result: "foobar",
    },
    {
      description: "should return a deeply nested value",
      values: "foo:\n  bar:\n    foobar: barfoo",
      path: "foo.bar.foobar",
      result: "barfoo",
    },
    {
      description: "should ignore an invalid path",
      values: "foo:\n  bar:\n    foobar: barfoo",
      path: "nope",
      result: undefined,
    },
    {
      description: "should ignore an invalid path (nested)",
      values: "foo:\n  bar:\n    foobar: barfoo",
      path: "not.exists",
      result: undefined,
    },
    {
      description: "should return the default value if the path is not valid",
      values: "foo: bar",
      path: "foobar",
      default: "BAR",
      result: "BAR",
    },
  ].forEach(t => {
    it(t.description, () => {
      expect(getValue(t.values, t.path, t.default)).toEqual(t.result);
    });
  });
});

describe("setValue", () => {
  [
    {
      description: "should set a value",
      values: "foo: bar",
      path: "foo",
      newValue: "BAR",
      result: "foo: BAR\n",
    },
    {
      description: "should set a nested value",
      values: "foo:\n  bar: foobar",
      path: "foo.bar",
      newValue: "FOOBAR",
      result: "foo:\n  bar: FOOBAR\n",
    },
    {
      description: "should set a deeply nested value",
      values: "foo:\n  bar:\n    foobar: barfoo",
      path: "foo.bar.foobar",
      newValue: "BARFOO",
      result: "foo:\n  bar:\n    foobar: BARFOO\n",
    },
    {
      description: "should add a new value",
      values: "foo: bar",
      path: "new",
      newValue: "value",
      result: "foo: bar\nnew: value\n",
    },
    {
      description: "should add a new nested value",
      values: "foo: bar",
      path: "this.new",
      newValue: 1,
      result: "foo: bar\nthis:\n  new: 1\n",
      error: false,
    },
    {
      description: "should add a new deeply nested value",
      values: "foo: bar",
      path: "this.new.value",
      newValue: 1,
      result: "foo: bar\nthis:\n  new:\n    value: 1\n",
      error: false,
    },
    {
      description: "Adding a value for a path partially defined (null)",
      values: "foo: bar\nthis:\n",
      path: "this.new.value",
      newValue: 1,
      result: "foo: bar\nthis:\n  new:\n    value: 1\n",
      error: false,
    },
    {
      description: "Adding a value for a path partially defined (object)",
      values: "foo: bar\nthis: {}\n",
      path: "this.new.value",
      newValue: 1,
      result: "foo: bar\nthis: { new: { value: 1 } }\n",
      error: false,
    },
  ].forEach(t => {
    it(t.description, () => {
      let res: any;
      try {
        res = setValue(t.values, t.path, t.newValue);
      } catch (e) {
        expect(t.error).toBe(true);
      }
      expect(res).toEqual(t.result);
    });
  });
});

describe("validate", () => {
  [
    {
      description: "Should validate a valid object",
      values: "foo: bar\n",
      schema: { properties: { foo: { type: "string" } } } as JSONSchema4,
      valid: true,
      errors: null,
    },
    {
      description: "Should validate an invalid object",
      values: "foo: bar\n",
      schema: { properties: { foo: { type: "integer" } } } as JSONSchema4,
      valid: false,
      errors: [
        {
          keyword: "type",
          dataPath: ".foo",
          schemaPath: "#/properties/foo/type",
          params: {
            type: "integer",
          },
          message: "should be integer",
        },
      ],
    },
  ].forEach(t => {
    it(t.description, () => {
      const res = validate(t.values, t.schema);
      expect(res.valid).toBe(t.valid);
      expect(res.errors).toEqual(t.errors);
    });
  });
});