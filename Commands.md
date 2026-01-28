# WIZ Extension Commands

## Project & View Management

- **Refresh All Views** (`wiz-extension.refresh`)  
  선택된 프로젝트 기준으로 WIZ 뷰들(Pages, Components, Layouts, Angular, Assets, Server Controller, Server Model, Server Route)을 모두 새로고침합니다.

- **Select Project** (`wiz-extension.selectProject`)  
  `project/*` 디렉토리에서 프로젝트 목록을 가져와 Quick Pick으로 선택합니다. 선택된 프로젝트는 상태바에 표시되고, 이후 모든 WIZ 기능의 기준이 됩니다.

## App / Portal Components

- **Create App Page** (`wiz-extension.addPage`)  
  `src/app` 아래에 Page용 App 디렉토리를 생성합니다.  
  `namespace`, `title`, `viewuri`, `layout`, `controller` 등을 입력받아 `app.json`, `view.html`/`view.pug`, `view.ts`를 자동 생성합니다.

- **Create App Component** (`wiz-extension.addComponent`)  
  생성 위치를 선택할 수 있습니다:
  - 기본 App: `src/app`
  - Portal App: `src/portal/[module]/app`
  - Portal Widget: `src/portal/[module]/widget`  
  기본 App의 경우 기존 App 규칙(page/component/layout)에 맞는 `app.json`과 view/component 파일을 생성하고,  
  Portal의 경우 `portal.component` / `portal.widget` 템플릿 구조(`mode: "portal"`)로 `app.json`과 view/component 파일을 생성합니다.

- **Create App Layout** (`wiz-extension.addLayout`)  
  `src/app` 아래에 Layout용 App 디렉토리를 생성합니다.  
  `namespace`, `title`, `controller` 등을 입력받아 `app.json`, `view.html`/`view.pug`, `view.ts`를 생성합니다.

- **Delete App Component (Page/Component/Layout)** (`wiz-extension.deleteAppComponent`)  
  App/Widget 단위 디렉토리를 삭제합니다. 대상:
  - `src/app/*`
  - `src/portal/[module]/app/*`
  - `src/portal/[module]/widget/*`  
  커맨드 팔렛트에서 실행 시, 모든 항목을 Quick Pick으로 보여주며, Portal 항목은 `[module] name` 형식으로 표시됩니다.

## Server Route

- **Create Server Route** (`wiz-extension.addRoute`)  
  생성 위치를 선택할 수 있습니다:
  - 기본 Route: `src/route`
  - Portal Route: `src/portal/[module]/route`  
  `id`, `title`, `route`, `controller`를 입력받아 `app.json`과 `controller.py`를 생성합니다.

- **Delete Server Route** (`wiz-extension.deleteRoute`)  
  Route 디렉토리를 삭제합니다. 대상:
  - `src/route/*`
  - `src/portal/[module]/route/*`  
  Quick Pick에서 Route를 선택하면, 해당 Route 디렉토리(`app.json`, `controller.py` 포함)를 통째로 삭제합니다.

## Server Controller & Model

- **Create Server Controller** (`wiz-extension.addController`)  
  생성 위치를 선택할 수 있습니다:
  - 기본 Controller: `src/controller`
  - Portal Controller: `src/portal/[module]/controller`  
  파일 이름을 입력하면(확장자 생략 가능) `.py` 컨트롤러 파일을 생성합니다.

- **Create Server Model** (`wiz-extension.addModel`)  
  생성 위치를 선택할 수 있습니다:
  - 기본 Model: `src/model`
  - Portal Model: `src/portal/[module]/model`  
  파일 이름을 입력하면 `.py` 모델 파일을 생성합니다.

- **Delete Server Controller or Model** (`wiz-extension.deleteControllerModel`)  
  먼저 Controller / Model 중 하나를 선택하고, 다음 경로의 `.py` 파일들을 대상으로 합니다:
  - Controller: `src/controller/*.py`, `src/portal/[module]/controller/*.py`
  - Model: `src/model/*.py`, `src/portal/[module]/model/*.py`  
  Quick Pick에서 파일을 선택하면 해당 파일을 삭제하고, 관련 WIZ 뷰를 새로고침합니다. Portal 파일은 `[module] filename.py` 형식으로 표시됩니다.

## Assets

- **Upload Asset File** (`wiz-extension.uploadAsset`)  
  업로드 위치를 선택할 수 있습니다:
  - 기본 Assets: `src/assets`
  - Portal Assets: `src/portal/[module]/assets`  
  선택한 파일들을 해당 경로로 복사하고, Assets 뷰를 새로고침합니다.

- **Download Asset File** (`wiz-extension.downloadAsset`)  
  Assets 뷰에서 선택한 파일(또는 커맨드 팔렛트로 선택한 파일)을 로컬 경로로 저장합니다.

- **Delete Asset File or Folder** (`wiz-extension.deleteAsset`)  
  파일/폴더 단위로 Assets를 삭제합니다. 대상:
  - `src/assets/**`
  - `src/portal/[module]/assets/**`  
  재귀적으로 수집한 목록을 Quick Pick으로 보여주고, 선택한 파일 또는 디렉토리를 삭제합니다. Portal 항목은 `[module]` prefix와 함께 표시됩니다.