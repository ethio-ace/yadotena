import re

with open('/home/wondm/Documents/yadotena/yadotena-frontend/src/services/api.ts', 'r') as f:
    content = f.read()

# Remove mock imports
content = re.sub(r'import \{ mock.*?\} from "../mocks";\n', '', content)

# Remove dummy data variables
content = re.sub(r'let categoriesList.*?];\n', '', content, flags=re.DOTALL)
content = re.sub(r'let menuList.*?];\n', '', content, flags=re.DOTALL)
content = re.sub(r'let tablesList.*?];\n', '', content, flags=re.DOTALL)
content = re.sub(r'let ordersList.*?];\n', '', content, flags=re.DOTALL)
content = re.sub(r'let expensesList.*?];\n', '', content, flags=re.DOTALL)
content = re.sub(r'let customersList.*?];\n', '', content, flags=re.DOTALL)
content = re.sub(r'let serviceRequestsList.*?\];\n', '', content, flags=re.DOTALL)

# Remove requestApi function completely
content = re.sub(r'// Helper to make backend requests.*?}\n\n', '', content, flags=re.DOTALL)

# Change all requestApi<...>(... , () => {...}) to requestApiStrict<...>(...)
import ast

def replace_calls(text):
    # This is a bit tricky with regex, we can just replace requestApi with requestApiStrict 
    # and strip the third argument. But it's easier to just do it via string manipulation.
    pass

with open('/home/wondm/Documents/yadotena/yadotena-frontend/src/services/api.ts', 'w') as f:
    f.write(content)
