const fs = require('fs');
const path = require('path');
function walk(dir, files=[]) {
  fs.readdirSync(dir).forEach(name=>{
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) return walk(p, files);
    files.push({path: p, size: stat.size});
  });
  return files;
}
const root = process.cwd();
const files = walk(root);
const empty = files.filter(f=>f.size===0).map(f=>path.relative(root,f.path));
console.log(JSON.stringify(empty,null,2));
