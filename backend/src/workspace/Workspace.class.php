<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);


class Workspace {

    protected int $workspaceId = 0;
    protected string $workspacePath = '';
    public WorkspaceDAO $workspaceDAO;

    // dont' change order, it's the order of possible dependencies
    const subFolders = ['Resource', 'Unit', 'Booklet', 'Testtakers', 'SysCheck'];


    static function getAll(): array {

        $workspaces = [];
        $class = get_called_class();

        foreach (Folder::glob(DATA_DIR, 'ws_*') as $workspaceDir) {

            $workspaceFolderNameParts = explode('_', $workspaceDir);
            $workspaceId = (int) array_pop($workspaceFolderNameParts);
            $workspaces[$workspaceId] = new $class($workspaceId);
        }

        return $workspaces;
    }


    function __construct(int $workspaceId) {

        $this->workspaceId = $workspaceId;
        $this->workspacePath = $this->getOrCreateWorkspacePath();
        $this->workspaceDAO = new WorkspaceDAO();
    }


    protected function getOrCreateWorkspacePath(): string {

        $workspacePath = DATA_DIR . '/ws_' .  $this->workspaceId;
        if (file_exists($workspacePath) and !is_dir($workspacePath)) {
            throw new Exception("Workspace dir $this->workspaceId seems not to be a proper directory!");
        }
        if (!file_exists($workspacePath)) {
            if (!mkdir($workspacePath)) {
                throw new Exception("Could not create workspace dir $this->workspaceId");
            }
        }
        return $workspacePath;
    }


    public function getOrCreateSubFolderPath(string $type): string {

        $subFolderPath = $this->workspacePath . '/' . $type;
        if (!in_array($type, $this::subFolders)) {
            throw new Exception("Invalid type `$type`!");
        }
        if (file_exists($subFolderPath) and !is_dir($subFolderPath)) {
            throw new Exception("Workspace dir `$subFolderPath` seems not to be a proper directory!");
        }
        if (!file_exists($subFolderPath)) {
            if (!mkdir($subFolderPath)) {
                throw new Exception("Could not create workspace dir `$subFolderPath`");
            }
        }
        return $subFolderPath;
    }


    public function getId(): int {

        return $this->workspaceId;
    }


    public function getWorkspacePath(): string {

        return $this->workspacePath;
    }


//    public function getFiles(): array {
//
//        $files = [];
//
//        foreach ($this::subFolders as $type) {
//
//            $pattern = ($type == 'Resource') ? "*.*" : "*.[xX][mM][lL]";
//            $filePaths = Folder::glob($this->getOrCreateSubFolderPath($type), $pattern);
//
//            foreach ($filePaths as $filePath) {
//
//                if (!is_file($filePath)) {
//                    continue;
//                }
//
//                $files[] = new File($filePath, $type);
//            }
//        }
//
//        return $files;
//    }


    public function deleteFiles(array $filesToDelete): array {

        $report = [
            'deleted' => [],
            'did_not_exist' => [],
            'not_allowed' => [],
            'was_used' => []
        ];

        $cachedFilesToDelete = $this->workspaceDAO->getFiles($this->workspaceId, $this->workspacePath, $filesToDelete);
        $blockedFiles = $this->workspaceDAO->getBlockedFiles($this->workspaceId, $cachedFilesToDelete);

        foreach($filesToDelete as $localFilePath) {

            $cachedFile = $cachedFilesToDelete[$localFilePath] ?? null;

            // file does not exist in db means, it must be something not validatable like sysCheck-Reports
            if ($cachedFile) {

                if (isset($blockedFiles[$localFilePath])) {

                    $report['was_used'][] = $localFilePath;
                    continue;
                }


                if (!$this->deleteFileFromDb($cachedFile)) {

                    $report['error'][] = $localFilePath;
                    continue;
                }
            }

            $fullPath = $this->workspacePath . '/' . $localFilePath;
            if (!file_exists($fullPath)) {

                $report['did_not_exist'][] = $localFilePath;
                continue;
            }

            if ($this->isPathLegal($fullPath) and unlink($fullPath)) {

                $report['deleted'][] = $localFilePath;

            } else {

                $report['not_allowed'][] = $localFilePath;
            }


        }

        return $report;
    }


    private function deleteFileFromDb(?File $file): bool {

        try {

            if (is_a($file, XMLFileTesttakers::class)) {

                $this->workspaceDAO->deleteLoginSource($this->workspaceId, $file->getName());
            }

            if (is_a($file, ResourceFile::class) and $file->isPackage()) {

                $file->uninstallPackage();
            }

            $this->workspaceDAO->deleteFileMeta($this->workspaceId, $file->getName(), $file->getType());

        } catch (Exception $e) {

            return false;
        }
        return true;
    }


    private function isUnusedFileAndCanBeDeleted(File $file, array $allFilesToDelete): bool {

        if (!$file->isUsed()) {

            return true;
        }

        $usingFiles = array_keys($file->getUsedBy());

        return count(array_intersect($usingFiles, $allFilesToDelete)) === count($usingFiles);
    }



    protected function isPathLegal(string $path): bool {

        return substr_count($path, '..') == 0;
    }


    // takes a file from the workspace-dir toplevel and puts it to the correct subdir if valid
    public function importUnsortedFile(string $fileName): array {

        if (FileExt::has($fileName, 'ZIP') and !FileExt::has($fileName, 'ITCR.ZIP')) {

            $relativeFilePaths = $this->unpackUnsortedZipArchive($fileName);
            $toDelete = [$fileName, $this->getExtractionDirName($fileName)];

        } else {

            $relativeFilePaths = [$fileName];
            $toDelete = $relativeFilePaths;
        }

        $files = $this->sortValidUnsortedFiles($relativeFilePaths);
        $this->deleteUnsorted($toDelete);

        return $files;
    }


    protected function sortValidUnsortedFiles(array $relativeFilePaths): array {

        $files = $this->crossValidateUnsortedFiles($relativeFilePaths);
        $filesAfterSorting = [];

        foreach ($files as $filesOfAType) {
            foreach ($filesOfAType as $localFilePath => $file) {

                if ($file->isValid()) {

                    $this->sortUnsortedFile($localFilePath, $file);
                }

                $this->storeFileMeta($file);

                $filesAfterSorting[$localFilePath] = $file;
            }
        }

        return $filesAfterSorting;
    }


    protected function crossValidateUnsortedFiles(array $localFilePaths): array {

        $files = array_fill_keys(Workspace::subFolders, []);

        $validator = new WorkspaceValidator($this);

        foreach ($localFilePaths as $localFilePath) {

            $file = File::get($this->workspacePath . '/' . $localFilePath, null, true);
            $validator->addFile($file->getType(), $file, true);
            $files[$file->getType()][$localFilePath] = $file;
        }

        $validator->validate();

        return $files;
    }


    protected function sortUnsortedFile(string $localFilePath, File $file): void {

        $targetFolder = $this->workspacePath . '/' . $file->getType();

        if (!file_exists($targetFolder)) {
            if (!mkdir($targetFolder)) {

                $file->report('error', "Could not create folder: `$targetFolder`.");
                return;
            }
        }

        $targetFilePath = $targetFolder . '/' . basename($localFilePath);

        if (file_exists($targetFilePath)) {
            $oldFile = File::get($targetFilePath);

            if ($oldFile->getId() !== $file->getId()) {

                $file->report('error', "File of name `{$oldFile->getName()}` did already exist.
                    Overwriting was rejected since new file's ID (`{$file->getId()}`) 
                    differs from old one (`{$oldFile->getId()}`)."
                );
                return;
            }

            if (!unlink($targetFilePath)) {

                $file->report('error', "Could not delete file: `$targetFolder/$localFilePath`");
                return;
            }

            $file->report('warning', "File of name `{$oldFile->getName()}` did already exist and was overwritten.");
        }

        if (!rename($this->workspacePath . '/' . $localFilePath, $targetFilePath)) {

            $file->report('error', "Could not move file to `$targetFolder/$localFilePath`");
            return;
        }

        $file->setFilePath($targetFilePath);
    }


    protected function unpackUnsortedZipArchive(string $fileName): array {

        $filePath = "$this->workspacePath/$fileName";
        $extractionFolder = $this->getExtractionDirName($fileName);
        $extractionPath = "$this->workspacePath/$extractionFolder";

        // sometimes in error cases there are remains from previous attempts
        if (file_exists($extractionPath) and is_dir($extractionPath)) {
            Folder::deleteContentsRecursive($extractionPath);
            rmdir($extractionPath);
        }

        if (!mkdir($extractionPath)) {
            throw new Exception("Could not create directory for extracted files: `$extractionPath`");
        }

        ZIP::extract($filePath, $extractionPath);

        return Folder::getContentsFlat($extractionPath, $extractionFolder);
    }


    protected function getExtractionDirName(string $fileName): string {

        return "{$fileName}_Extract";
    }


    protected function deleteUnsorted(array $relativePaths): void {

        foreach ($relativePaths as $relativePath) {

            $filePath = "$this->workspacePath/$relativePath";
            if (is_dir($filePath)) {
                Folder::deleteContentsRecursive($filePath);
                rmdir($filePath);
            }
            if (is_file($filePath)) {
                unlink($filePath);
            }
        }
    }


    public function findFileById(string $type, string $findId, bool $allowSimilarVersion = false): File {

        if ($file = $this->workspaceDAO->getFile($this->workspaceId, $findId, $type)) {

            if ($file->isValid()) {

                return $file;
            }
        }

        if (!$allowSimilarVersion) {

            throw new HttpError("No $type with id `$findId` found on workspace `$this->workspaceId`!", 404);
        }

        if ($file = $this->workspaceDAO->getFileSimilarVersion($this->workspaceId, $findId, $type)) {

            if ($file->isValid()) {

                return $file;
            }
        }

        throw new HttpError("No suitable version of $type `$findId` found on workspace `$this->workspaceId`!", 404);
    }


    public function countFilesOfAllSubFolders(): array {

        $result = [];

        foreach ($this::subFolders as $type) {

            $result[$type] = $this->countFiles($type);
        }

        return $result;
    }


    public function countFiles(string $type): int {

        $pattern = ($type == 'Resource') ? "*.*" : "*.[xX][mM][lL]";
        return count(Folder::glob($this->getOrCreateSubFolderPath($type), $pattern));
    }


    public function delete(): void {

        Folder::deleteContentsRecursive($this->workspacePath);
        rmdir($this->workspacePath);
    }


    // TODO unit-test
    public function storeAllFilesMeta(): array {

        $files = $this->getValidatorWithAllFilesFromFs();
        $typeStats = array_fill_keys(Workspace::subFolders, 0);
        $loginStats = [
            'deleted' => 0,
            'added' => 0
        ];
        $invalidCount = 0;

        $filesInDb = $this->workspaceDAO->getFileNames($this->workspaceId);
        $filesInFolder = $files->getFiles();

        foreach ($filesInDb as $file) {

            $fileFullPath = $this->getWorkspacePath() . "/{$file['type']}/{$file['name']}";

            if (!isset($filesInFolder[$fileFullPath])) {

                $this->workspaceDAO->deleteFileMeta($this->workspaceId, $file['name'], $file['type']);
                $loginStats['deleted'] += $this->workspaceDAO->deleteLoginSource($this->workspaceId, $file['name']);
            }
        }

        foreach ($files->getFiles() as $file) {

            /* @var $file File */

            $file->crossValidate($files);

            if (!$file->isValid()) {

                $invalidCount++;
//                continue;
            }

            $stats = $this->storeFileMeta($file);
            $loginStats['deleted'] += $stats['logins_deleted'];
            $loginStats['added'] += $stats['logins_added'];

            $typeStats[$file->getType()] += 1;
        }

        return [
            'valid' => $typeStats,
            'invalid' => $invalidCount,
            'logins' => $loginStats
        ];
    }


    // TODO unit-test
    public function storeFileMeta(File $file): ?array {

        $stats = [
            'logins_deleted' => 0,
            'logins_added' => 0,
            'resource_packages_installed' => 0,
            'attachments_noted' => 0
        ];

        $this->workspaceDAO->storeFileMeta($this->getId(), $file);

        if (!$file->isValid()) {

            return $stats;
        }

        if (is_a($file, XMLFileTesttakers::class)) {

            list($deleted, $added) = $this->workspaceDAO->updateLoginSource($this->getId(), $file->getName(), $file->getAllLogins());
            $stats['logins_deleted'] = $deleted;
            $stats['logins_added'] = $added;
        }

        if (is_a($file, ResourceFile::class) and $file->isPackage()) {

            $file->installPackage();
            $stats['resource_packages_installed'] = 1;
        }

        if (is_a($file, XMLFileBooklet::class)) {

            $requestedAttachments = $this->getRequestedAttachments($file);
            $this->workspaceDAO->updateUnitDefsAttachments($this->workspaceId, $file->getId(), $requestedAttachments);
            $stats['attachments_noted'] = count($requestedAttachments);
        }

        return $stats;
    }


    public function getPackageFilePath($packageName, $resourceName): string {

        $path = $this->getWorkspacePath() . "/Resource/$packageName/$resourceName";
        if (!file_exists($path)) {
            throw new HttpError("File of package `$packageName` not found: `$resourceName` ($path)");
        }
        return $path;
    }


    public function getRequestedAttachments(XMLFileBooklet $booklet): array {

        return []; // TODO! tmp !!!!

        $requestedAttachments = [];
        foreach ($booklet->getUnitIds(false) as $uniId) {

            $unit = $this->findFileById('Unit', $uniId);
            /* @var $unit XMLFileUnit */
            $requestedAttachments = array_merge($requestedAttachments, $unit->getRequestedAttachments());
        }
        return $requestedAttachments;
    }


    private function getValidatorWithAllFilesFromFs(): WorkspaceValidator {

        $validator = new WorkspaceValidator($this);

        foreach (Workspace::subFolders as $type) {

            $pattern = ($type == 'Resource') ? "*.*" : "*.[xX][mM][lL]";
            $files = Folder::glob($this->getOrCreateSubFolderPath($type), $pattern);

            foreach ($files as $filePath) {

                $file = File::get($filePath, $type, true);
                $validator->addFile($type, $file);
            }
        }

        return $validator;
    }
}
