export const StringUtils = {
    template: (templateString, templateVars) => {
        return new Function("return `" + templateString + "`;").call(templateVars);
    }
}

export const ObjectUtils = {

    paths: (object) => {
        let paths = []
        Object.keys(object).forEach(key => {
                if (typeof object[key] === 'object') {
                    ObjectUtils.paths(object[key])
                        .map(subPath => `${key}.${subPath}`)
                        .forEach(path => paths.push(path))
                } else {
                    paths.push(key)
                }
            }
        )
        return paths;

    }

}
