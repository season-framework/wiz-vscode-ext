const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class ProjectItem {
    constructor(name, projectPath, wizRoot, workspaceName) {
        this.name = name;
        this.projectPath = projectPath;
        this.wizRoot = wizRoot;
        this.workspaceName = workspaceName;
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        this.contextValue = 'wizProject';
        this.command = {
            command: 'wiz-extension.selectProject',
            title: 'Select Project',
            arguments: [{ projectPath: projectPath, name: name }]
        };
    }

    get label() {
        const displayName = this.workspaceName && vscode.workspace.workspaceFolders.length > 1
            ? `[${this.workspaceName}] ${this.name}`
            : this.name;
        return displayName;
    }

    get tooltip() {
        return this.projectPath;
    }

    get iconPath() {
        return new vscode.ThemeIcon('folder');
    }
}

class ProjectTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return Promise.resolve([]);
        }

        if (!element) {
            const projects = [];

            for (const folder of workspaceFolders) {
                const workspaceRoot = folder.uri.fsPath;
                
                // WIZ 구조 찾기
                const wizRoot = this.findWizRoot(workspaceRoot);
                if (!wizRoot) {
                    continue;
                }

                const projectPath = path.join(wizRoot, 'project');
                if (!fs.existsSync(projectPath)) {
                    continue;
                }

                try {
                    const entries = fs.readdirSync(projectPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const projectDirPath = path.join(projectPath, entry.name);
                            projects.push(new ProjectItem(
                                entry.name,
                                projectDirPath,
                                wizRoot,
                                folder.name
                            ));
                        }
                    }
                } catch (error) {
                    console.error(`Error reading ${projectPath}:`, error);
                }
            }

            return Promise.resolve(projects);
        }

        return Promise.resolve([]);
    }

    isWizStructure(directoryPath) {
        const wizIndicators = ['project', 'config', 'plugin', 'ide', 'public'];
        let foundCount = 0;
        
        try {
            const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && wizIndicators.includes(entry.name)) {
                    foundCount++;
                }
            }
            const hasProject = fs.existsSync(path.join(directoryPath, 'project'));
            return hasProject && foundCount >= 2;
        } catch (error) {
            return false;
        }
    }

    findWizRoot(startPath) {
        let currentPath = startPath;
        const rootPath = path.parse(startPath).root;
        
        while (currentPath !== rootPath) {
            if (this.isWizStructure(currentPath)) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
        }
        
        return null;
    }
}

// findWizRoot를 외부에서도 사용할 수 있도록 export
ProjectTreeProvider.prototype.findWizRoot = ProjectTreeProvider.prototype.findWizRoot;

module.exports = ProjectTreeProvider;
