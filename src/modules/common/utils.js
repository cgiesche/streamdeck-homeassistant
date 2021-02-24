export const ObjectUtils = {

    paths: (object) => {
        let paths = []
        Object.keys(object).forEach(key => {
                let keyPath = key;
                if (Array.isArray(object)) {
                    keyPath = `[${key}]`
                }
                if (Array.isArray(object[key])) {
                    ObjectUtils.paths(object[key])
                        .map(subPath => `${keyPath}${subPath}`)
                        .forEach(path => paths.push(path))
                } else if (typeof object[key] === 'object') {
                    ObjectUtils.paths(object[key])
                        .map(subPath => `${keyPath}.${subPath}`)
                        .forEach(path => paths.push(path))
                } else {
                    paths.push(key)
                }
            }
        )
        return paths;
    }

}
