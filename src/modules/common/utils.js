export const StringUtils = {
    template : (templateString, templateVars) => {
        return new Function("return `" + templateString + "`;").call(templateVars);
    }
}
