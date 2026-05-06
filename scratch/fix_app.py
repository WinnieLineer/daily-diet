import os

path = 'c:/Users/linw2/daily-diet/src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "const { getUserInfo, isLoggedIn, refreshLogin } = import('./lib/googleAuth')" in line:
        new_lines.append(line.replace("const { getUserInfo, isLoggedIn, refreshLogin } = ", ""))
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Fix applied successfully.")
