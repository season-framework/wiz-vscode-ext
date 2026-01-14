const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { AppComponent } = require('./appTreeProvider');

class RouteItem {
    constructor(name, folderPath, label, isActive = false) {
        this.name = name;
        this.folderPath = folderPath;
        this.label = label;
        this.isActive = isActive;
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        this.command = {
            command: 'wiz-extension.openRoute',
            title: 'Open Route',
            arguments: [{ folderPath: folderPath, name: name }]
        };
    }

    get tooltip() {
        return this.folderPath;
    }

    get description() {
        if (this.isActive) {
            return `● ${this.name}`;
        }
        return this.name;
    }

    get iconPath() {
        if (this.isActive) {
            return new vscode.ThemeIcon('check');
        }
        return new vscode.ThemeIcon('symbol-interface');
    }

    get contextValue() {
        return 'wizRouteItem';
    }
}

class CategoryItem {
    constructor(name, filePath, type) {
        this.name = name;
        this.filePath = filePath;
        this.type = type;
        this.collapsibleState = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory() 
            ? vscode.TreeItemCollapsibleState.Collapsed 
            : vscode.TreeItemCollapsibleState.None;
        this.contextValue = 'wizCategoryItem';
        this.command = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)]
        } : undefined;
    }

    get label() {
        return this.name;
    }

    get tooltip() {
        return this.filePath;
    }

    get iconPath() {
        if (fs.existsSync(this.filePath)) {
            const stat = fs.statSync(this.filePath);
            if (stat.isFile()) {
                const ext = path.extname(this.filePath).toLowerCase();
                const iconMap = {
                    '.ts': 'symbol-class',
                    '.js': 'symbol-method',
                    '.html': 'file-code',
                    '.pug': 'file-code',
                    '.scss': 'symbol-color',
                    '.css': 'symbol-color',
                    '.py': 'symbol-method',
                    '.json': 'symbol-constant',
                    '.png': 'file-media',
                    '.jpg': 'file-media',
                    '.svg': 'file-media'
                };
                return new vscode.ThemeIcon(iconMap[ext] || 'file');
            }
        }
        return new vscode.ThemeIcon('folder');
    }
}

class CategoryTreeProvider {
    constructor(categoryType) {
        this.categoryType = categoryType; // 'page', 'component', 'layout', 'angular', 'assets', 'controller', 'model', 'route'
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.selectedProjectPath = null;
        this.activeComponentPath = null;
    }

    setActiveComponentPath(componentPath) {
        this.activeComponentPath = componentPath;
        this.refresh();
    }

    setSelectedProject(projectPath) {
        this.selectedProjectPath = projectPath;
        this.refresh();
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!this.selectedProjectPath) {
            return Promise.resolve([]);
        }

        const srcPath = path.join(this.selectedProjectPath, 'src');
        if (!fs.existsSync(srcPath)) {
            return Promise.resolve([]);
        }

        if (!element) {
            // 루트 레벨
            const items = await this.getRootItems(srcPath);
            return Promise.resolve(items);
        }

        // 하위 항목들
        // AppComponent와 RouteItem은 하위 항목을 표시하지 않음 (클릭 시 파일들이 열림)
        if (element instanceof AppComponent || element instanceof RouteItem) {
            return Promise.resolve([]);
        }
        
        if (element instanceof CategoryItem && fs.existsSync(element.filePath)) {
            return this.getChildItems(element.filePath);
        }

        return Promise.resolve([]);
    }

    async getRootItems(srcPath) {
        const items = [];
        if (this.categoryType === 'page' || this.categoryType === 'component' || this.categoryType === 'layout') {
            // App 구성요소들 - AppComponent 사용하여 묶어서 표시
            const appPath = path.join(srcPath, 'app');
            if (fs.existsSync(appPath)) {
                try {
                    const entries = fs.readdirSync(appPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && !entry.name.startsWith('__')) {
                            const componentPath = path.join(appPath, entry.name);
                            if (this.isAppComponent(componentPath)) {
                                const componentType = this.getComponentType(entry.name);
                                if (componentType === this.categoryType) {
                                    // app.json에서 제목 가져오기
                                    const appJsonPath = path.join(componentPath, 'app.json');
                                    let label = entry.name;
                                    if (fs.existsSync(appJsonPath)) {
                                        try {
                                            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                                            if (appJson.title) {
                                                label = `${entry.name} - ${appJson.title}`;
                                            }
                                        } catch (e) {
                                            // JSON 파싱 실패 시 이름만 사용
                                        }
                                    }

                                    // 활성화된 구성요소인지 확인
                                    const isActive = this.activeComponentPath && 
                                        path.normalize(this.activeComponentPath) === path.normalize(componentPath);

                                    items.push(new AppComponent(entry.name, componentPath, label, isActive));
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[${this.categoryType}] Error reading ${appPath}:`, error);
                }
            }
        } else if (this.categoryType === 'angular') {
            const angularPath = path.join(srcPath, 'angular');
            if (fs.existsSync(angularPath)) {
                // 디렉토리 자체가 아닌 내용물만 표시
                const childItems = await this.getChildItems(angularPath);
                items.push(...childItems);
            }
        } else if (this.categoryType === 'assets') {
            const assetsPath = path.join(srcPath, 'assets');
            if (fs.existsSync(assetsPath)) {
                // 디렉토리 자체가 아닌 내용물만 표시
                const childItems = await this.getChildItems(assetsPath);
                items.push(...childItems);
            }
        } else if (this.categoryType === 'controller') {
            const controllerPath = path.join(srcPath, 'controller');
            if (fs.existsSync(controllerPath)) {
                // 디렉토리 자체가 아닌 내용물만 표시
                const childItems = await this.getChildItems(controllerPath);
                items.push(...childItems);
            }
        } else if (this.categoryType === 'model') {
            const modelPath = path.join(srcPath, 'model');
            if (fs.existsSync(modelPath)) {
                // 디렉토리 자체가 아닌 내용물만 표시
                const childItems = await this.getChildItems(modelPath);
                items.push(...childItems);
            }
        } else if (this.categoryType === 'route') {
            // Route는 App처럼 디렉토리 단위로 묶어서 표시
            const routePath = path.join(srcPath, 'route');
            if (fs.existsSync(routePath)) {
                try {
                    const entries = fs.readdirSync(routePath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const routeItemPath = path.join(routePath, entry.name);
                            // app.json과 controller.py가 있는지 확인
                            const appJsonPath = path.join(routeItemPath, 'app.json');
                            const controllerPyPath = path.join(routeItemPath, 'controller.py');
                            
                            if (fs.existsSync(appJsonPath) || fs.existsSync(controllerPyPath)) {
                                let label = entry.name;
                                // app.json에서 제목 가져오기
                                if (fs.existsSync(appJsonPath)) {
                                    try {
                                        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                                        if (appJson.title) {
                                            label = `${entry.name} - ${appJson.title}`;
                                        }
                                    } catch (e) {
                                        // JSON 파싱 실패 시 이름만 사용
                                    }
                                }

                                // 활성화된 route인지 확인
                                const isActive = this.activeComponentPath && 
                                    path.normalize(this.activeComponentPath) === path.normalize(routeItemPath);

                                items.push(new RouteItem(entry.name, routeItemPath, label, isActive));
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[${this.categoryType}] Error reading route directory:`, error);
                }
            }
        }

        return Promise.resolve(items);
    }

    getChildItems(itemPath) {
        const items = [];
        
        if (!fs.existsSync(itemPath)) {
            return Promise.resolve([]);
        }

        try {
            const entries = fs.readdirSync(itemPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('__') || entry.name.startsWith('.')) {
                    continue;
                }

                const entryPath = path.join(itemPath, entry.name);
                items.push(new CategoryItem(entry.name, entryPath, this.categoryType));
            }
        } catch (error) {
            console.error(`Error reading ${itemPath}:`, error);
        }

        return Promise.resolve(items.sort((a, b) => {
            // 디렉토리 먼저, 그 다음 파일
            const aIsDir = fs.existsSync(a.filePath) && fs.statSync(a.filePath).isDirectory();
            const bIsDir = fs.existsSync(b.filePath) && fs.statSync(b.filePath).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.label.localeCompare(b.label);
        }));
    }

    isAppComponent(componentPath) {
        const appJsonPath = path.join(componentPath, 'app.json');
        return fs.existsSync(appJsonPath);
    }

    getComponentType(componentName) {
        if (componentName.startsWith('page.')) return 'page';
        if (componentName.startsWith('component.')) return 'component';
        if (componentName.startsWith('layout.')) return 'layout';
        return null;
    }
}

module.exports = CategoryTreeProvider;
