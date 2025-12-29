/**
 * ESLint 配置文件
 * 参考 MarkText 项目的配置风格
 * 适用于 Electron + Node.js + Browser 环境
 */

module.exports = {
    // 解析器选项
    parserOptions: {
        ecmaVersion: 2020, // 使用 ES2020 语法
        sourceType: 'module', // 使用 ES 模块
        ecmaFeatures: {
            globalReturn: true, // 允许在全局作用域中使用 return
            impliedStrict: false // 不强制严格模式
        }
    },

    // 环境配置
    env: {
        browser: true, // 浏览器环境（渲染进程）
        node: true, // Node.js 环境（主进程）
        es6: true, // ES6 特性
        es2020: true // ES2020 特性
    },

    // 扩展配置
    extends: [
        'eslint:recommended', // ESLint 推荐规则
        'plugin:node/recommended' // Node.js 推荐规则
    ],

    // 插件
    plugins: [
        'node' // Node.js 插件
    ],

    // 规则配置
    rules: {
        // 代码风格
        'indent': ['error', 4, {SwitchCase: 1}], // 使用 4 空格缩进
        'quotes': ['error', 'single', {avoidEscape: true}], // 使用单引号
        'semi': ['error', 'always'], // 必须使用分号
        'comma-dangle': ['error', 'never'], // 禁止尾随逗号
        'no-trailing-spaces': 'error', // 禁止行尾空格
        'eol-last': ['error', 'always'], // 文件末尾必须有空行

        // 变量和函数
        'no-unused-vars': ['warn', {
            argsIgnorePattern: '^_', // 允许以下划线开头的未使用参数
            varsIgnorePattern: '^_'
        }],

        'no-var': 'error', // 禁止使用 var
        'prefer-const': 'warn', // 优先使用 const
        'no-console': 'off', // 允许使用 console（Electron 应用需要）

        // 代码质量
        'no-eval': 'error', // 禁止使用 eval
        'no-implied-eval': 'error', // 禁止隐式 eval
        'no-new-func': 'error', // 禁止使用 new Function
        'no-script-url': 'error', // 禁止 javascript: URL
        'no-return-await': 'error', // 禁止不必要的 return await
        'require-await': 'warn', // async 函数必须包含 await

        // Node.js 特定规则
        'node/no-extraneous-require': 'off', // 关闭外部 require 检查（Electron 环境）
        'node/no-missing-require': 'off', // 关闭缺失 require 检查（动态路径）
        'node/no-unpublished-require': 'off', // 关闭未发布模块检查（Electron 内置模块）
        'node/no-unsupported-features/es-syntax': 'off', // 允许使用 ES 语法
        'node/shebang': 'off', // 不强制 shebang

        // 最佳实践
        'eqeqeq': ['error', 'always'], // 必须使用 === 和 !==
        'curly': ['error', 'all'], // 必须使用大括号
        'no-throw-literal': 'error', // 只能抛出 Error 对象
        'prefer-promise-reject-errors': 'error', // Promise reject 必须使用 Error

        // 代码组织
        'no-multiple-empty-lines': ['error', {max: 2, maxEOF: 1}], // 限制空行数量
        'padded-blocks': ['error', 'never'], // 禁止块内首尾空行
        'space-before-blocks': 'error', // 块前必须有空格
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }], // 函数括号前空格
        'keyword-spacing': 'error', // 关键字后空格
        'space-infix-ops': 'error', // 操作符周围空格
        'object-curly-spacing': ['error', 'never'], // 对象大括号内无空格
        'array-bracket-spacing': ['error', 'never'], // 数组方括号内无空格
        'comma-spacing': ['error', {before: false, after: true}], // 逗号后空格
        'key-spacing': ['error', {beforeColon: false, afterColon: true}], // 对象键值空格
        'brace-style': ['error', '1tbs'], // 大括号风格
        'camelcase': ['warn', {properties: 'never'}], // 变量名使用驼峰命名

        // 注释
        'spaced-comment': ['error', 'always', {
            line: {
                markers: ['/'],
                exceptions: ['-', '+']
            },
            block: {
                markers: ['!'],
                exceptions: ['*'],
                balanced: true
            }
        }] // 注释前必须有空格
    },

    // 针对特定文件的规则覆盖
    overrides: [
        {
            // 主进程文件（Node.js 环境）
            files: ['src/main/**/*.js', 'src/util/**/*.js'],
            env: {
                browser: false, // 主进程不是浏览器环境
                node: true
            },
            rules: {
                'no-console': 'off' // 主进程允许使用 console
            }
        },
        {
            // 渲染进程文件（浏览器环境）
            files: ['src/renderer/**/*.js', 'src/preferences/**/*.js'],
            env: {
                browser: true,
                node: true // Electron 渲染进程也可以使用 Node.js API
            },
            rules: {
                'no-console': 'off' // 渲染进程允许使用 console
            }
        }
    ]
};
