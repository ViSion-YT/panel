<?php
// Ta linia pozwala na zapytania z dowolnej domeny. Rozwiązuje problem CORS.
header("Access-Control-Allow-Origin: *");

// Reszta Twojego kodu...
header('Content-Type: application/json');

// ... i tak dalej
// Ustawienie, aby odpowiedzi były w formacie JSON
header('Content-Type: application/json');

// ##################################################################
// # WAŻNE: Wklej tutaj swój klucz API z portalu Faceit Developers  #
// ##################################################################
$faceitApiKey = '3daa12e4-1ec0-4ced-8d06-61c4073c211c';

// Funkcja pomocnicza do wykonywania zapytań do API Faceit
function callFaceitApi($url, $apiKey) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey
    ]);
    $output = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Jeśli API zwróciło błąd, zwracamy null
    if ($httpcode != 200) {
        return null;
    }

    return json_decode($output);
}

// Sprawdzanie, czy akcja to 'search'
$action = $_GET['action'] ?? '';
if ($action !== 'search') {
    echo json_encode(['error' => 'Nieprawidłowa akcja.']);
    exit;
}

// Sprawdzanie, czy podano nick
$nickname = $_GET['nickname'] ?? '';
if (empty($nickname)) {
    echo json_encode(['error' => 'Nie podano nazwy gracza.']);
    exit;
}

// Sprawdzanie, czy klucz API został wklejony
if ($faceitApiKey === 'TUTAJ_WKLEJ_SWÓJ_KLUCZ_API_SERVER_SIDE') {
    echo json_encode(['error' => 'Błąd konfiguracji serwera: Brak klucza API Faceit w pliku api.php.']);
    exit;
}

// --- KROK 1: Pobierz podstawowe dane gracza (w tym jego ID) ---
$playerDetailsUrl = "https://open.faceit.com/data/v4/players?nickname=" . urlencode($nickname);
$playerData = callFaceitApi($playerDetailsUrl, $faceitApiKey);

// Sprawdzamy, czy gracz został znaleziony
if (!$playerData || !isset($playerData->player_id)) {
    echo json_encode(['error' => 'Nie znaleziono gracza o podanej nazwie.']);
    exit;
}

$playerId = $playerData->player_id;
$avatar = $playerData->avatar ?? 'https://faceitfinder.com/themes/dark/images/new-avatar.png'; // Domyślny avatar, jeśli brak
$country = $playerData->country;
$steamNickname = $playerData->steam_nickname;

// --- KROK 2: Pobierz statystyki gracza dla CS2 używając jego ID ---
$playerStatsUrl = "https://open.faceit.com/data/v4/players/{$playerId}/stats/cs2";
$statsData = callFaceitApi($playerStatsUrl, $faceitApiKey);

if (!$statsData || !isset($statsData->lifetime)) {
    echo json_encode(['error' => 'Nie udało się pobrać statystyk dla tego gracza.']);
    exit;
}

// Przygotowanie odpowiedzi dla frontendu
$response = [
    'nickname' => $playerData->nickname,
    'avatar' => $avatar,
    'country' => $country,
    'steam_nickname' => $steamNickname,
    'faceit_url' => $playerData->faceit_url,
    'elo' => $playerData->games->cs2->faceit_elo ?? 'Brak', // ELO dla CS2
    'level' => $playerData->games->cs2->skill_level ?? 'Brak',
    'kd' => $statsData->lifetime->{'Average K/D Ratio'} ?? 'N/A',
    'matches' => $statsData->lifetime->{'Matches'} ?? 'N/A',
    'winrate' => $statsData->lifetime->{'Win Rate %'} ?? 'N/A',
];

// Wysłanie gotowej odpowiedzi w formacie JSON
echo json_encode($response);

?>
