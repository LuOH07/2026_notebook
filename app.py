"""Flask 页面入口：路由、模板数据和 Frozen-Flask 静态构建。"""

import json
import os
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask, Response, abort, render_template
from flask_frozen import Freezer


PROJECT_ROOT = Path(__file__).resolve().parent
PAGES_DIRECTORY = PROJECT_ROOT / "wiki" / "pages"
# GitLab 自动提供此变量；本地无需设置发布开关。
IS_GITLAB_CI = os.environ.get("GITLAB_CI") == "true"

# 两类数据独立维护：线上素材地址与成员资料。
ASSET_URLS = json.loads(
    (PROJECT_ROOT / "asset-map.json").read_text(encoding="utf-8")
)
MEMBER_CARDS = json.loads(
    (PROJECT_ROOT / "data" / "members.json").read_text(encoding="utf-8")
)


def validate_asset_urls():
    """本地预览与正式构建统一使用 iGEM 线上素材。"""
    invalid_paths = []
    for local_path, remote_url in ASSET_URLS.items():
        parsed_url = urlparse(remote_url) if isinstance(remote_url, str) else None
        if (
            parsed_url is None
            or parsed_url.scheme != "https"
            or parsed_url.hostname != "static.igem.wiki"
            or not parsed_url.path.strip("/")
        ):
            invalid_paths.append(local_path)

    if invalid_paths:
        raise RuntimeError(
            "Fill asset-map.json with valid static.igem.wiki URLs before running: "
            + ", ".join(invalid_paths)
        )


validate_asset_urls()

app = Flask(
    __name__,
    template_folder=str(PROJECT_ROOT / "wiki"),
    static_folder=str(PROJECT_ROOT / "static"),
)
app.config.update(
    FREEZER_DESTINATION=str(
        PROJECT_ROOT / "public" if IS_GITLAB_CI
        else PROJECT_ROOT.parent / "26web-local" / "preview"
    ),
    FREEZER_RELATIVE_URLS=True,
    FREEZER_IGNORE_MIMETYPE_WARNINGS=True,
)
freezer = Freezer(app)


# 模板工具：所有图片与字体共用这一套地址解析规则。
def asset_url(local_path):
    return ASSET_URLS[local_path]


def asset_config():
    """为浏览器端悬停脚本生成同一份资源映射。"""
    return {path: asset_url(path) for path in ASSET_URLS}


app.jinja_env.globals.update(
    asset_url=asset_url,
    asset_config=asset_config,
    member_cards=MEMBER_CARDS,
    member_mottos={member["id"]: member["motto"] for member in MEMBER_CARDS},
)


def page_templates():
    """普通页面使用单文件；复杂页面使用目录入口。"""
    templates = {
        path.stem: f"pages/{path.name}"
        for path in PAGES_DIRECTORY.glob("*.html")
        if path.stem != "members"  # Members 使用目录，忽略待手动清理的旧入口。
    }
    for path in PAGES_DIRECTORY.glob("*/index.html"):
        templates.setdefault(path.parent.name, f"pages/{path.parent.name}/index.html")
    return templates


# 页面统一继承 wiki/layout.html；Members 保留独立正文与交互。
@app.route("/")
def home():
    return render_template("pages/home.html")


@app.route("/team")
def team():
    return render_template("pages/members/index.html")


@app.route("/<page>")
def pages(page):
    page = page.lower()
    template = page_templates().get(page)
    if template is None:
        abort(404)
    return render_template(template)


@app.route("/fonts.css")
def fonts_css():
    return Response(render_template("fonts.css"), mimetype="text/css")


@freezer.register_generator
def all_pages():
    """未出现在导航中的页面也要纳入静态构建。"""
    for page in sorted(page_templates()):
        yield "pages", {"page": page}


@app.cli.command()
def freeze():
    """本地构建输出到项目外；GitLab CI 自动输出到 public/。"""
    freezer.freeze()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080)
