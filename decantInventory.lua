local current_stock = tonumber(redis.call('GET', KEYS[1]))

if not current_stock or current_stock < tonumber(ARGV[2]) then
    return 0
end

redis.call('DECRBY', KEYS[1], ARGV[2])

local payload = cjson.encode({
    user_id = ARGV[1],
    quantity = ARGV[2],
    created_at = ARGV[3]
})
redis.call('RPUSH', KEYS[2], payload)

return 1