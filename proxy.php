<?php
// Plik: proxy.php - ULEPSZONA WERSJA

// Ustaw nagłówki, aby zezwolić na zapytania z dowolnego źródła (dobre dla dewelopmentu)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Twój klucz API Faceit - jedyne miejsce, gdzie go trzymamy
$faceitApiKey = '531c6bf2-b10d-4aed-9081-d5736b27dc39';

$faceitApiBaseUrl = 'https://open.faceit.com/data/v4';

// Sprawdź, czy frontend przekazał parametr 'endpoint'
if (!isset($_GET['endpoint']) || empty($_GET['endpoint'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Brak parametru "endpoint" w zapytaniu do proxy.']);
    exit;
}

$endpoint = $_GET['endpoint'];
unset($_GET['endpoint']);

$queryString = http_build_query($_GET);

$apiUrl = $faceitApiBaseUrl . $endpoint;
if (!empty($queryString)) {
    $apiUrl .= '?' . $queryString;
}

// Użyj cURL do bezpiecznego wykonania zapytania serwer-do-serwera
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $faceitApiKey]);
// Opcjonalnie: dodaj User-Agent, aby wyglądać jak przeglądarka
curl_setopt($ch, CURLOPT_USERAGENT, 'VISTATS Analysis Panel');

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Zwróć odpowiedź z Faceit (lub błąd) do frontendu
if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Błąd cURL w proxy', 'details' => $curlError]);
} else {
    http_response_code($httpcode);
    echo $response;
}
exit;
?>