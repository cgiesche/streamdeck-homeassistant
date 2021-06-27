module.exports = {
    chainWebpack: config => {
        config.module
            .rule("Snap")
            .test(require.resolve("snapsvg/dist/snap.svg.js"))
            .use("imports-loader")
            .loader("imports-loader?wrapper=window&additionalCode=module.exports=0;")
            .end();

        config.resolve.alias.set("snapsvg", "snapsvg/dist/snap.svg.js");
    },
    pages: {
        plugin: 'src/plugin/main.js',
        pi: 'src/pi/main.js'
    },
    publicPath: './'
}
