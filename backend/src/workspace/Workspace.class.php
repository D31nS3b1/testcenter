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
    $this->workspaceDAO = new WorkspaceDAO($this->workspaceId, $this->workspacePath);
  }

  protected function getOrCreateWorkspacePath(): string {
    $workspacePath = DATA_DIR . '/ws_' . $this->workspaceId;
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

  public function deleteFiles(array $filesToDelete): array {
    $report = [
      'deleted' => [],
      'did_not_exist' => [],
      'not_allowed' => [],
      'was_used' => []
    ];

    $cachedFilesToDelete = $this->workspaceDAO->getFiles($filesToDelete, true);
    $blockedFiles = $this->workspaceDAO->getBlockedFiles(array_merge(...array_values($cachedFilesToDelete)));

    foreach ($filesToDelete as $localFilePath) {
      $pathParts = explode('/', $localFilePath, 2);

      if (count($pathParts) < 2) {
        $report['incorrect_path'][] = $localFilePath;
        continue;
      }

      list($type, $name) = $pathParts;

      $cachedFile = $cachedFilesToDelete[$type][$name] ?? null;

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

      $report[$this->deleteFileFromFs($this->workspacePath . '/' . $localFilePath)][] = $localFilePath;
    }

    return $report;
  }

  protected function deleteFileFromFs(string $fullPath): string {
    if (!file_exists($fullPath)) {
      return 'did_not_exist';
    }

    if ($this->isPathLegal($fullPath) and unlink($fullPath)) {
      return 'deleted';
    }

    return 'not_allowed';
  }

  private function deleteFileFromDb(?File $file): bool {
    try {
      if (is_a($file, XMLFileTesttakers::class)) {
        $this->workspaceDAO->deleteLoginSource($file->getName());
      }

      if (is_a($file, ResourceFile::class) and $file->isPackage()) {
        $file->uninstallPackage();
      }

      $this->workspaceDAO->deleteFile($file);

    } catch (Exception $e) {
      echo $e->getMessage();
      return false;
    }
    return true;
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
          $this->workspaceDAO->storeFile($file);
          $this->storeFileMeta($file);
          $this->updateRelatedFiles($file);
        }

        $filesAfterSorting[$localFilePath] = $file;
      }
    }

    return $filesAfterSorting;
  }

  protected function crossValidateUnsortedFiles(array $localFilePaths): array {
    $files = array_fill_keys(Workspace::subFolders, []);

    $workspaceCache = new WorkspaceCache($this);
    $workspaceCache->loadAllFiles(); // TODO! read from DB instead, and only affected files

    foreach ($localFilePaths as $localFilePath) {
      $file = File::get($this->workspacePath . '/' . $localFilePath);
      $workspaceCache->addFile($file->getType(), $file, true);
      $files[$file->getType()][$localFilePath] = $file;
    }

    $workspaceCache->validate();

    return $files;
  }

  protected function sortUnsortedFile(string $localFilePath, File $file): bool {
    $targetFolder = $this->workspacePath . '/' . $file->getType();

    if (!file_exists($targetFolder)) {
      if (!mkdir($targetFolder)) {
        $file->report('error', "Could not create folder: `$targetFolder`.");
        return false;
      }
    }

    $targetFilePath = $targetFolder . '/' . basename($localFilePath);

    if (file_exists($targetFilePath)) {
      $oldFile = File::get($targetFilePath, $file->getType());

      if ($oldFile->getId() !== $file->getId()) {
        $file->report('error', "File of name `{$oldFile->getName()}` did already exist. "
          . "Overwriting was rejected since new file's ID (`{$file->getId()}`) differs from old one (`{$oldFile->getId()}`)."
        );
        return false;
      }

      if ($oldFile->getVeronaModuleId() !== $file->getVeronaModuleId()) {
        $file->report('error', "File of name `{$oldFile->getName()}` did already exist. "
          . "Overwriting was rejected since new file's Verona-Module-ID (`{$file->getVeronaModuleId()}`) differs from old one (`{$oldFile->getVeronaModuleId()}`)."
          . "Filenames not according to the Verona-standard are a bad idea anyway and and will be forbidden in the future."
        );
        return false;
      }

      if (!Version::isCompatible($oldFile->getVersion(), $file->getVersion())) {
        $file->report('error', "File of name `{$oldFile->getName()}` did already exist. "
          . "Overwriting was rejected since version conflict between old ({$oldFile->getVersion()}) and new ({$file->getVersion()}) file."
          . "Filenames not according to the Verona-standard are a bad idea anyway and and will be forbidden in the future."
        );
        return false;
      }

      if (!unlink($targetFilePath)) {
        $file->report('error', "Could not delete file: `$targetFolder/$localFilePath`");
        return false;
      }

      $file->report('warning', "File of name `{$oldFile->getName()}` did already exist and was overwritten.");
    }

    if (!rename($this->workspacePath . '/' . $localFilePath, $targetFilePath)) {
      $file->report('error', "Could not move file to `$targetFolder/$localFilePath`");
      return false;
    }

    $file->readFileMeta($targetFilePath);

    return true;
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

  public function getFileById(string $type, string $fileId): File {
    if ($file = $this->workspaceDAO->getFileById($fileId, $type)) {
      if ($file->isValid()) {
        return $file;
      }
    }

    throw new HttpError("No $type with id `$fileId` found on workspace `$this->workspaceId`!", 404);
  }

  public function getFileByName(string $type, string $fileName): File {
    $file = File::get("$this->workspacePath/$type/$fileName", $type);

    if ($file->isValid()) {
      return $file;
    }

    throw new HttpError("No $type with name `$fileName` found on workspace `$this->workspaceId`!", 404);
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
  public function storeAllFiles(): array {
    $workspaceCache = new WorkspaceCache($this);
    $workspaceCache->loadAllFiles();

    $typeStats = array_fill_keys(Workspace::subFolders, 0);
    $loginStats = [
      'added' => 0
    ];
    $invalidCount = 0;

    $loginStats['deleted'] = $this->removeVanishedFilesFromDB($workspaceCache);

    $workspaceCache->validate();

    foreach ($workspaceCache->getFiles(true) as $file) {
      /* @var File $file */

      if (!$file->isValid()) {
        $invalidCount++;
      }

      $this->workspaceDAO->storeFile($file);
      $typeStats[$file->getType()] += 1;
    }

    foreach ($workspaceCache->getFiles(true) as $file) {
      $stats = $this->storeFileMeta($file);

      $loginStats['deleted'] += $stats['logins_deleted'];
      $loginStats['added'] += $stats['logins_added'];
    }

    return [
      'valid' => $typeStats,
      'invalid' => $invalidCount,
      'logins' => $loginStats
    ];
  }

  private function removeVanishedFilesFromDB(WorkspaceCache $workspaceCache): int {
    $filesInDb = $this->workspaceDAO->getAllFiles();
    $filesInFolder = $workspaceCache->getFiles(true);
    $deletedLogins = 0;

    foreach ($filesInDb as $fileSet) {
      foreach ($fileSet as $file) {
        /* @var File $file */

        if (!isset($filesInFolder[$file->getPath()])) {
          $this->workspaceDAO->deleteFile($file);
          $deletedLogins += $this->workspaceDAO->deleteLoginSource($file->getName());
        }
      }
    }

    return $deletedLogins;
  }

  // TODO unit-test
  public function storeFileMeta(File $file): ?array {
    $stats = [
      'logins_deleted' => 0,
      'logins_added' => 0,
      'resource_packages_installed' => 0,
      'attachments_noted' => 0,
      'resolved_relations' => 0,
      'relations_resolved' => 0,
      'relations_unresolved' => 0
    ];

    if (!$file->isValid()) {
      return $stats;
    }

    if ($file::canBeRelationSubject) {
      list($relationsUnresolved) = $this->workspaceDAO->storeRelations($file);
      $stats['relations_resolved'] = count($file->getRelations()) - count($relationsUnresolved);
      $stats['relations_unresolved'] = count($relationsUnresolved);
    }

    if (is_a($file, XMLFileTesttakers::class)) {
      list($deleted, $added) = $this->workspaceDAO->updateLoginSource($file->getName(), $file->getAllLogins());
      $stats['logins_deleted'] = $deleted;
      $stats['logins_added'] = $added;
    }

    if (is_a($file, ResourceFile::class) and $file->isPackage()) {
      $file->installPackage();
      $stats['resource_packages_installed'] = 1;
    }

    if (is_a($file, XMLFileBooklet::class)) {
      $requestedAttachments = $this->getRequestedAttachments($file);
      $this->workspaceDAO->updateUnitDefsAttachments($file->getId(), $requestedAttachments);
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
    if (!$booklet->isValid()) {
      return [];
    }

    $requestedAttachments = [];
    foreach ($booklet->getUnitIds() as $uniId) {
      $unit = $this->getFileById('Unit', $uniId);
      /* @var $unit XMLFileUnit */
      $requestedAttachments = array_merge($requestedAttachments, $unit->getRequestedAttachments());
    }
    return $requestedAttachments;
  }

  public function getFileRelations(File $file): array {
    return $this->workspaceDAO->getFileRelations($file->getName(), $file->getType());
  }

  private function updateRelatedFiles(File $file): void {
    $relatingFiles = $this->workspaceDAO->getRelatingFiles($file);

    foreach ($relatingFiles as $fileSet) {
      foreach ($fileSet as $relatingFile) {
        /* @var File $relatingFile */

        $this->storeFileMeta($relatingFile);
      }
    }
  }
}
