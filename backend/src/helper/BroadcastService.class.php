<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);
// TODO unit-test
// TODO find a way to integrate this in e2e-tests

class BroadcastService {

    private static $bsUriPush = '';
    private static $bsUriSubscribe = '';


    static function setup(string $bsUriPush, string $bsUriSubscribe) {

        self::$bsUriPush = $bsUriPush;
        self::$bsUriSubscribe = $bsUriSubscribe;
    }


    static function getBsUriSubscribe() {

        return BroadcastService::$bsUriSubscribe;
    }


    static function getStatus(): string {

        if (!BroadcastService::$bsUriPush or !BroadcastService::$bsUriSubscribe) {

            return 'off';
        }

        $ping = BroadcastService::send('', '', 'GET');

        return ($ping === null) ? 'unreachable' : 'on';
    }


    static function registerChannel(string $channelName, array $data): ?string {

        $bsToken = md5((string) rand(0, 99999999));
        $data['token'] = $bsToken;
        $response = BroadcastService::send("$channelName/register", json_encode($data));
        $url = str_replace(['http://', 'https://'], ['ws://', 'wss://'], BroadcastService::getBsUriSubscribe()) . "/ws?token=$bsToken";
        return ($response !== null) ? $url : null;
    }


    static function sessionChange(SessionChangeMessage $sessionChange): ?string {

        return BroadcastService::send('push/session-change', json_encode($sessionChange));
    }


    static function send(string $endpoint, string $message = '', string $verb = "POST"): ?string {

        if (!BroadcastService::$bsUriPush or !BroadcastService::$bsUriSubscribe) {

            return null;
        }

        $curl = curl_init();

        curl_setopt_array($curl, [
            CURLOPT_URL => BroadcastService::$bsUriPush . '/' . $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => $verb,
            CURLOPT_POSTFIELDS => $message,
            CURLOPT_FAILONERROR => false, // allows to read body on error
            CURLOPT_HTTPHEADER => [
                "Content-Type: application/json"
            ],
        ]);

        $curlResponse = curl_exec($curl);
        $errorCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

        if (($errorCode === 0) or ($curlResponse === false)) {
            error_log("BroadcastingService responds Error on `[$verb] $endpoint`: not available");
            return null;
        }

        if ($errorCode >= 400) {
            error_log("BroadcastingService responds Error on `[$verb] $endpoint`: [$errorCode] $curlResponse");
            return null;
        }

        return $curlResponse;
    }
}
