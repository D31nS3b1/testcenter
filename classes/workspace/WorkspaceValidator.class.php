<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);


class WorkspaceValidator {

    protected array $allFiles = [];
    protected array $versionMap = [];
    protected int $workspaceId = -1;


    function __construct(int $workspaceId) {

        $this->workspaceId = $workspaceId;
        $this->readFiles();
        $this->createVersionMap();
    }


    public function validate(): array {

        $this->crossValidate();
        $this->findUnusedItems();

        return $this->fullReport();
    }


    public function getId(): int {

        return $this->workspaceId;
    }


    public function getFiles(): array {

        $files = [];

        foreach ($this->allFiles as $fileSet) {

            foreach ($fileSet as /** @var File */ $file) {

                $files[$file->getPath()] = $file;
            }
        }

        return $files;
    }


    // TODO unit-test
    public function findDuplicates(File $ofFile): array {

        $files = [];

        foreach ($this->allFiles as $type => $fileList) {

            if ($ofFile->getType() !== substr($type, 0, strlen($ofFile->getType()))) {
                continue;
            }

            foreach ($fileList as $id => $file) {

                if (($id === $ofFile->getId()) and ($file->getName() !== $ofFile->getName())) {

                    $files[] = $file;
                }
            }
        }

        return $files;
    }


    public function getResource(string $resourceId, bool $ignoreMinorAndPatchVersion): ?ResourceFile {

        if ($ignoreMinorAndPatchVersion) {

            $mayorVersionResourceId = FileName::normalize($resourceId, true);

            // minor version given, and exact this version exists
            if (($mayorVersionResourceId !== $resourceId) and isset($this->allFiles['Resource'][$resourceId])) {

                return $this->allFiles['Resource'][$resourceId];
            }

            // other major version exists, or no minor version specified
            if (isset($this->versionMap[$mayorVersionResourceId])) {

                return $this->allFiles['Resource'][$this->versionMap[$mayorVersionResourceId]];
            }
        }

        if (isset($this->allFiles['Resource'][$resourceId])) {

            return $this->allFiles['Resource'][$resourceId];
        }

        return null;
    }


    public function getUnit(string $unitId): ?XMLFileUnit {

        if (isset($this->allFiles['Unit'][$unitId])) {
            return $this->allFiles['Unit'][$unitId];
        }

        return null;
    }


    public function getBooklet(string $bookletId): ?XMLFileBooklet {

        if (isset($this->allFiles['Booklet'][$bookletId])) {
            return $this->allFiles['Booklet'][$bookletId];
        }

        return null;
    }


    public function getSysCheck(string $sysCheckId): ?XMLFileSysCheck {

        if (isset($this->allFiles['SysCheck'][$sysCheckId])) {
            return $this->allFiles['SysCheck'][$sysCheckId];
        }

        return null;
    }


    public function addFile(string $type, File $file): string {

        if (isset($this->allFiles[$type][$file->getId()])) {

            $type = $this->getPseudoTypeForDuplicate($type, $file->getId());

        }

        $this->allFiles[$type][$file->getId()] = $file;

        return "$type/{$file->getId()}";
    }


    private function readFiles() {

        $this->allFiles = [];
        $workspace = new Workspace($this->workspaceId);

        foreach (Workspace::subFolders as $type) {

            $pattern = ($type == 'Resource') ? "*.*" : "*.[xX][mM][lL]";
            $files = Folder::glob($workspace->getOrCreateSubFolderPath($type), $pattern);

            $this->allFiles[$type] = [];

            foreach ($files as $filePath) {

                $file = File::get($filePath, $type, true);
                $this->addFile($type, $file);
            }
        }
    }


    protected function getPseudoTypeForDuplicate(string $type, string $id): string {

        $i = 2;
        while (isset($this->allFiles["$type/duplicates/$id/$i"])) {
            $i++;
        }
        return "$type/duplicates/$id/$i";
    }


    protected function createVersionMap(): void {

        uksort($this->allFiles['Resource'], function($rId1, $rId2) {
            $rId1 = substr($rId1, 0, strrpos($rId1, "."));
            $rId2 = substr($rId2, 0, strrpos($rId2, "."));
            return strcasecmp($rId1, $rId2);
        });
        $this->versionMap = [];
        foreach ($this->allFiles['Resource'] as $key => $value) {
            $this->versionMap[FileName::normalize($key, true)] = $key;
        }
    }


    private function crossValidate(): void {

        foreach ($this->allFiles as $fileList) { // correct order is ensured by the order of readFiles

            foreach ($fileList as /* @var */ $file) {

                if ($file->isValid()) {

                    $file->crossValidate($this);
                }
            }
        }
    }


    private function fullReport(): array {

        $report = [];

        foreach (array_keys($this->allFiles) as $type) {

            foreach ($this->allFiles[$type] as $file) {

                if (!count($file->getValidationReport())) {
                    continue;
                }

                $fileCode = "{$file->getType()}/{$file->getName()}";
                $report[$fileCode] = $file->getValidationReport();
            }
        }

        return $report;
    }


    private function findUnusedItems() {

        foreach (array_keys($this->allFiles) as $type) {

            foreach($this->allFiles[$type] as $file) { /* @var $file File */
                if (method_exists($file, 'isUsed') && !$file->isUsed()) {
                    $file->report('warning', "{$file->getType()} is never used");
                }
            }
        }
    }
}
