/* ============================================================
   标准序列化工具 — 所有数据更新脚本共用此文件
   用法: node -e "require('./js/serialize.js').save(SPECS)"
   ============================================================ */

const fs = require('fs');
const path = require('path');
const DATA_JS = path.join(__dirname, 'data.js');

function save(SPECS) {
  var pdfCount = SPECS.filter(function (s) { return s.hasPdf; }).length;
  var lines = [];
  lines.push('// 公路道路设计规范数据 — ' + SPECS.length + '部规范 | ' + pdfCount + '部有离线PDF');
  lines.push('// 自动生成 | 请勿手动编辑');
  lines.push('var SPECS = [');

  SPECS.forEach(function (sp, i) {
    lines.push('{');
    lines.push("code:'" + sp.code + "',");
    lines.push("title:'" + sp.title + "',");
    lines.push("cat:'" + sp.cat + "',");
    lines.push("status:'" + sp.status + "',");
    lines.push("tags:" + JSON.stringify(sp.tags) + ",");
    lines.push("pdf:" + (sp.pdf ? "'" + sp.pdf + "'" : "null") + ",");
    lines.push("hasPdf:" + sp.hasPdf + ",");
    // 核心：只转义反引号，彻底清除$（不转义）
    var sc = sp.content.replace(/`/g, '\\`').replace(/\$/g, '');
    lines.push("content:`" + sc + "`");
    lines.push('}');
    if (i < SPECS.length - 1) lines[lines.length - 1] += ',';
  });

  lines.push('];');
  lines.push('');
  fs.writeFileSync(DATA_JS, lines.join('\n'), 'utf-8');
  console.log('✅ data.js 已保存: ' + SPECS.length + '部规范 | ' + Buffer.byteLength(lines.join('\n'), 'utf-8') + '字节');
  return SPECS.length;
}

// 如果直接运行此脚本，读取并重新保存（清理$）
if (require.main === module) {
  var vm = require('vm');
  var code = fs.readFileSync(DATA_JS, 'utf-8');
  var ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
  save(ctx.SPECS);
}

module.exports = { save: save };
