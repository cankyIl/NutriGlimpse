import gdown,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
files=gdown.download_folder(id='1l-iA7Y6t8sXIwislklIE_2iRVqQ_PCW0',skip_download=True,quiet=False)
print(files)
